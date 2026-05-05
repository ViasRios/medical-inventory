import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  BelongsTo, ForeignKey, AllowNull, Min,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseOrder } from './purchase-order.model';
import { MedicalSupply } from '../../inventory/models/medical-supply.model';

@Table({ tableName: 'order_items', modelName: 'OrderItem' })
export class OrderItem extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @ForeignKey(() => PurchaseOrder) @AllowNull(false) @Column(DataType.UUID) orderId!: string;
  @BelongsTo(() => PurchaseOrder) order!: PurchaseOrder;
  @ForeignKey(() => MedicalSupply) @AllowNull(false) @Column(DataType.UUID) supplyId!: string;
  @BelongsTo(() => MedicalSupply) supply!: MedicalSupply;
  @AllowNull(false) @Min(1) @Column(DataType.INTEGER) quantityOrdered!: number;
  @Default(0) @Column(DataType.INTEGER) quantityReceived!: number;
  @AllowNull(false) @Column(DataType.DECIMAL(10, 2)) unitPrice!: number;
  @Column(DataType.DECIMAL(10, 2)) discount?: number;
}
