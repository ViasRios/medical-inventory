import { sequelize } from '../../shared/database/connection';
import { PurchaseOrder, OrderStatus } from './models/purchase-order.model';
import { OrderItem } from './models/order-item.model';
import { MedicalSupply } from '../inventory/models/medical-supply.model';
import { Supplier } from '../suppliers/models/supplier.model';
import { InventoryService } from '../inventory/inventory.service';
import { MovementType, MovementReason } from '../inventory/models/stock-movement.model';
import { NotFoundError, ValidationAppError, ConflictError } from '../../shared/middleware/error.middleware';
import { logger } from '../../shared/utils/logger';

export interface CreateOrderDto {
  supplierId: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: Array<{ supplyId: string; quantityOrdered: number; unitPrice: number; discount?: number }>;
}

export class OrdersService {
  private inventoryService = new InventoryService();

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await PurchaseOrder.count();
    return `OC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async createOrder(dto: CreateOrderDto, createdBy: string): Promise<PurchaseOrder> {
    const supplier = await Supplier.findByPk(dto.supplierId);
    if (!supplier || !supplier.active) throw new NotFoundError('Proveedor activo');
    for (const item of dto.items) {
      const supply = await MedicalSupply.findByPk(item.supplyId);
      if (!supply) throw new NotFoundError(`Insumo ${item.supplyId}`);
    }
    const t = await sequelize.transaction();
    try {
      const orderNumber = await this.generateOrderNumber();
      const totalAmount = dto.items.reduce((acc, item) => {
        const gross = item.quantityOrdered * item.unitPrice;
        return acc + (item.discount ? gross * (1 - item.discount / 100) : gross);
      }, 0);
      const order = await PurchaseOrder.create(
        { orderNumber, supplierId: dto.supplierId, status: OrderStatus.PENDING,
          expectedDeliveryDate: dto.expectedDeliveryDate, totalAmount, notes: dto.notes, createdBy } as any,
        { transaction: t }
      );
      await OrderItem.bulkCreate(
        dto.items.map((item) => ({ ...item, orderId: order.id })) as any,
        { transaction: t }
      );
      await t.commit();
      logger.info(`Orden creada: ${orderNumber}`);
      return this.findById(order.id);
    } catch (error) { await t.rollback(); throw error; }
  }

  async findAll(filters: { status?: OrderStatus; supplierId?: string; page?: number; limit?: number } = {}): Promise<{ rows: PurchaseOrder[]; count: number }> {
    const { status, supplierId, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (supplierId) where['supplierId'] = supplierId;
    return PurchaseOrder.findAndCountAll({
      where,
      include: [{ model: Supplier, attributes: ['id','name','contactName','phone'] }, { model: OrderItem }],
      limit, offset: (page - 1) * limit, order: [['createdAt', 'DESC']],
    });
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const order = await PurchaseOrder.findByPk(id, {
      include: [{ model: Supplier }, { model: OrderItem, include: [{ model: MedicalSupply, attributes: ['id','sku','name','unit','currentStock'] }] }],
    });
    if (!order) throw new NotFoundError('Orden de compra');
    return order;
  }

  async approveOrder(id: string, approvedBy: string): Promise<PurchaseOrder> {
    const order = await this.findById(id);
    if (order.status !== OrderStatus.PENDING) throw new ConflictError(`La orden no puede aprobarse en estado '${order.status}'`);
    await order.update({ status: OrderStatus.CONFIRMED, approvedBy, approvedAt: new Date() });
    return order;
  }

  async receiveOrder(id: string, dto: { items: Array<{ orderItemId: string; quantityReceived: number; lotNumber?: string; expirationDate?: string }>; notes?: string; receivedBy: string }): Promise<PurchaseOrder> {
    const order = await this.findById(id);
    if (![OrderStatus.CONFIRMED, OrderStatus.PARTIAL].includes(order.status)) {
      throw new ValidationAppError('Solo se pueden recibir órdenes confirmadas o parciales');
    }
    const t = await sequelize.transaction();
    try {
      for (const received of dto.items) {
        const item = order.items.find((i) => i.id === received.orderItemId);
        if (!item) throw new NotFoundError(`Item ${received.orderItemId}`);
        const remaining = item.quantityOrdered - item.quantityReceived;
        if (received.quantityReceived > remaining) {
          throw new ValidationAppError(`Cantidad recibida excede lo pendiente (${remaining})`);
        }
        await item.update({ quantityReceived: item.quantityReceived + received.quantityReceived }, { transaction: t });
        await this.inventoryService.registerMovement({
          supplyId: item.supplyId, type: MovementType.IN, reason: MovementReason.PURCHASE,
          quantity: received.quantityReceived, unitCost: Number(item.unitPrice),
          referenceNumber: order.orderNumber, notes: dto.notes, performedBy: dto.receivedBy,
        });
      }
      const updatedOrder = await this.findById(id);
      const allReceived = updatedOrder.items.every((i) => i.quantityReceived >= i.quantityOrdered);
      const anyReceived = updatedOrder.items.some((i) => i.quantityReceived > 0);
      const newStatus = allReceived ? OrderStatus.RECEIVED : anyReceived ? OrderStatus.PARTIAL : order.status;
      await order.update({ status: newStatus, ...(allReceived && { actualDeliveryDate: new Date() }) }, { transaction: t });
      await t.commit();
      return this.findById(id);
    } catch (error) { await t.rollback(); throw error; }
  }

  async cancelOrder(id: string, cancelledBy: string): Promise<PurchaseOrder> {
    const order = await this.findById(id);
    if ([OrderStatus.RECEIVED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new ConflictError(`No se puede cancelar en estado '${order.status}'`);
    }
    await order.update({ status: OrderStatus.CANCELLED });
    logger.info(`Orden ${order.orderNumber} cancelada por ${cancelledBy}`);
    return order;
  }
}
