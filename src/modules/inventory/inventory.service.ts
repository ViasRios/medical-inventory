import { Op } from 'sequelize';
import { sequelize } from '../../shared/database/connection';
import { MedicalSupply, SupplyCategory } from './models/medical-supply.model';
import { StockMovement, MovementType, MovementReason } from './models/stock-movement.model';
import { Supplier } from '../suppliers/models/supplier.model';
import { NotFoundError, ValidationAppError, ConflictError } from '../../shared/middleware/error.middleware';
import { AlertService } from '../alerts/alert.service';
import { logger } from '../../shared/utils/logger';

export interface CreateSupplyDto {
  sku: string; name: string; description?: string;
  category: SupplyCategory; unit: string;
  minStock?: number; criticalStock?: number; maxStock?: number;
  unitCost: number; storageCondition?: string;
  manufacturer?: string; registroSanitario?: string; supplierId?: string;
}

export interface StockMovementDto {
  supplyId: string; type: MovementType; reason: MovementReason;
  quantity: number; unitCost?: number; referenceNumber?: string;
  area?: string; notes?: string; performedBy: string;
}

export interface InventoryFilters {
  category?: SupplyCategory; supplierId?: string;
  lowStock?: boolean; search?: string; page?: number; limit?: number;
}

export class InventoryService {
  private alertService: AlertService;
  constructor() { this.alertService = new AlertService(); }

  async createSupply(dto: CreateSupplyDto): Promise<MedicalSupply> {
    const existing = await MedicalSupply.findOne({ where: { sku: dto.sku } });
    if (existing) throw new ConflictError(`El SKU '${dto.sku}' ya existe`);
    if (dto.supplierId) {
      const supplier = await Supplier.findByPk(dto.supplierId);
      if (!supplier) throw new NotFoundError('Proveedor');
    }
    const supply = await MedicalSupply.create(dto as any);
    logger.info(`Insumo creado: ${supply.sku} - ${supply.name}`);
    return supply;
  }

  async findAll(filters: InventoryFilters = {}): Promise<{ rows: MedicalSupply[]; count: number }> {
    const { category, supplierId, search, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = { active: true };
    if (category) where['category'] = category;
    if (supplierId) where['supplierId'] = supplierId;
    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
      ];
    }
    return MedicalSupply.findAndCountAll({
      where, limit, offset: (page - 1) * limit, order: [['name', 'ASC']],
    });
  }

  async findById(id: string): Promise<MedicalSupply> {
    const supply = await MedicalSupply.findByPk(id, {
      include: [{ model: Supplier }],
    });
    if (!supply) throw new NotFoundError('Insumo médico');
    return supply;
  }

  async updateSupply(id: string, dto: Partial<CreateSupplyDto>): Promise<MedicalSupply> {
    const supply = await this.findById(id);
    if (dto.sku && dto.sku !== supply.sku) {
      const dup = await MedicalSupply.findOne({ where: { sku: dto.sku } });
      if (dup) throw new ConflictError(`SKU '${dto.sku}' ya está en uso`);
    }
    await supply.update(dto);
    return supply;
  }

  async registerMovement(dto: StockMovementDto): Promise<StockMovement & { stockAfter: number }> {
    const supply = await MedicalSupply.findByPk(dto.supplyId);
    if (!supply) throw new NotFoundError('Insumo médico');
    const stockBefore = supply.currentStock;
    let stockAfter: number;
    if (dto.type === MovementType.IN) {
      stockAfter = stockBefore + dto.quantity;
    } else if (dto.type === MovementType.OUT || dto.type === MovementType.EXPIRY) {
      if (dto.quantity > stockBefore) {
        throw new ValidationAppError(
          `Stock insuficiente. Disponible: ${stockBefore}, Solicitado: ${dto.quantity}`
        );
      }
      stockAfter = stockBefore - dto.quantity;
    } else if (dto.type === MovementType.ADJUSTMENT) {
      stockAfter = dto.quantity;
    } else {
      stockAfter = stockBefore - dto.quantity;
    }
    const t = await sequelize.transaction();
    try {
      const movement = await StockMovement.create(
        { ...dto, stockBefore, stockAfter, performedAt: new Date() } as any,
        { transaction: t }
      );
      await supply.update({ currentStock: stockAfter }, { transaction: t });
      await t.commit();
      await this.alertService.checkStockLevel(supply, stockAfter);
      logger.info(`Movimiento: ${dto.type} | ${supply.sku} | ${stockBefore} -> ${stockAfter}`);
      return movement as any;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getMovementHistory(supplyId: string, from?: Date, to?: Date): Promise<StockMovement[]> {
    await this.findById(supplyId);
    const where: Record<string, unknown> = { supplyId };
    if (from || to) {
      where['performedAt'] = {
        ...(from && { [Op.gte]: from }),
        ...(to && { [Op.lte]: to }),
      };
    }
    return StockMovement.findAll({ where, order: [['performedAt', 'DESC']] });
  }

  async getLowStockReport(): Promise<MedicalSupply[]> {
    return MedicalSupply.findAll({
      where: {
        active: true,
        [Op.or]: [
          sequelize.literal('"current_stock" = 0'),
          sequelize.literal('"current_stock" <= "critical_stock"'),
          sequelize.literal('"current_stock" <= "min_stock"'),
        ],
      },
      include: [{ model: Supplier, attributes: ['name', 'email', 'phone'] }],
      order: [['currentStock', 'ASC']],
    });
  }

  async getExpiringSupplies(daysAhead = 30): Promise<MedicalSupply[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return MedicalSupply.findAll({
      where: {
        active: true,
        currentStock: { [Op.gt]: 0 },
        expirationDate: { [Op.between]: [new Date(), futureDate] },
      },
      order: [['expirationDate', 'ASC']],
    });
  }

  async getValuationReport(): Promise<{ total: number; byCategory: Record<string, { count: number; value: number }> }> {
    const supplies = await MedicalSupply.findAll({ where: { active: true } });
    let total = 0;
    const byCategory: Record<string, { count: number; value: number }> = {};
    for (const s of supplies) {
      const value = s.currentStock * Number(s.unitCost);
      total += value;
      if (!byCategory[s.category]) byCategory[s.category] = { count: 0, value: 0 };
      byCategory[s.category].count++;
      byCategory[s.category].value += value;
    }
    return { total, byCategory };
  }
}
