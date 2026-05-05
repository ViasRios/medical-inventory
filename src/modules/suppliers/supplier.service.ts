import { Op } from 'sequelize';
import { Supplier } from './models/supplier.model';
import { MedicalSupply } from '../inventory/models/medical-supply.model';
import { NotFoundError, ConflictError } from '../../shared/middleware/error.middleware';
import { logger } from '../../shared/utils/logger';

export interface CreateSupplierDto {
  name: string; rfc: string; address?: string;
  contactName: string; phone: string; email: string;
  deliveryDays?: number; notes?: string;
}

export class SupplierService {
  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const existing = await Supplier.findOne({
      where: { [Op.or]: [{ rfc: dto.rfc.toUpperCase() }, { name: dto.name }] },
    });
    if (existing) throw new ConflictError('Ya existe un proveedor con ese RFC o nombre');
    const supplier = await Supplier.create({ ...dto, rfc: dto.rfc.toUpperCase() } as any);
    logger.info(`Proveedor creado: ${supplier.name}`);
    return supplier;
  }

  async findAll(filters: { search?: string; active?: boolean; page?: number; limit?: number } = {}): Promise<{ rows: Supplier[]; count: number }> {
    const { search, active, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (active !== undefined) where['active'] = active;
    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { rfc: { [Op.iLike]: `%${search}%` } },
        { contactName: { [Op.iLike]: `%${search}%` } },
      ];
    }
    return Supplier.findAndCountAll({ where, limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = await Supplier.findByPk(id, {
      include: [{ model: MedicalSupply, where: { active: true }, required: false, attributes: ['id','sku','name','currentStock','minStock','unit'] }],
    });
    if (!supplier) throw new NotFoundError('Proveedor');
    return supplier;
  }

  async update(id: string, dto: Partial<CreateSupplierDto>): Promise<Supplier> {
    const supplier = await this.findById(id);
    if (dto.rfc && dto.rfc !== supplier.rfc) {
      const dup = await Supplier.findOne({ where: { rfc: dto.rfc.toUpperCase() } });
      if (dup) throw new ConflictError('Ese RFC ya está registrado');
      dto.rfc = dto.rfc.toUpperCase();
    }
    await supplier.update(dto);
    return supplier;
  }

  async deactivate(id: string): Promise<void> {
    const supplier = await this.findById(id);
    await supplier.update({ active: false });
  }

  async getSupplierStats(id: string): Promise<{ totalSupplies: number; totalValue: number; lowStockItems: number }> {
    await this.findById(id);
    const supplies = await MedicalSupply.findAll({ where: { supplierId: id, active: true } });
    const totalValue = supplies.reduce((acc, s) => acc + s.currentStock * Number(s.unitCost), 0);
    const lowStockItems = supplies.filter((s) => s.currentStock <= s.minStock).length;
    return { totalSupplies: supplies.length, totalValue, lowStockItems };
  }
}
