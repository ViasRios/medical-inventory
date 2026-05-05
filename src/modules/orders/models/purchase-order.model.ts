import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  BelongsTo, ForeignKey, HasMany, AllowNull,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Supplier } from '../../suppliers/models/supplier.model';
import { OrderItem } from './order-item.model';

export enum OrderStatus {
  DRAFT     = 'draft',
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  PARTIAL   = 'partial',
  RECEIVED  = 'received',
  CANCELLED = 'cancelled',
}

@Table({ tableName: 'purchase_orders', modelName: 'PurchaseOrder' })
export class PurchaseOrder extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @AllowNull(false) @Column(DataType.STRING(30)) orderNumber!: string;
  @ForeignKey(() => Supplier) @AllowNull(false) @Column(DataType.UUID) supplierId!: string;
  @BelongsTo(() => Supplier) supplier!: Supplier;
  @AllowNull(false) @Default(OrderStatus.DRAFT)
  @Column(DataType.ENUM(...Object.values(OrderStatus))) status!: OrderStatus;
  @Column(DataType.DATE) expectedDeliveryDate?: Date;
  @Column(DataType.DATE) actualDeliveryDate?: Date;
  @Default(0) @Column(DataType.DECIMAL(12, 2)) totalAmount!: number;
  @Column(DataType.TEXT) notes?: string;
  @AllowNull(false) @Column(DataType.STRING(100)) createdBy!: string;
  @Column(DataType.STRING(100)) approvedBy?: string;
  @Column(DataType.DATE) approvedAt?: Date;
  @HasMany(() => OrderItem) items!: OrderItem[];
}
