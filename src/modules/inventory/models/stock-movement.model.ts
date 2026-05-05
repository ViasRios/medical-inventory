import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  BelongsTo, ForeignKey, AllowNull, Min,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { MedicalSupply } from './medical-supply.model';

export enum MovementType {
  IN         = 'in',
  OUT        = 'out',
  ADJUSTMENT = 'adjustment',
  TRANSFER   = 'transfer',
  RETURN     = 'return',
  EXPIRY     = 'expiry',
}

export enum MovementReason {
  PURCHASE          = 'purchase',
  CLINICAL_USE      = 'clinical_use',
  DONATION          = 'donation',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  TRANSFER          = 'transfer',
  SUPPLIER_RETURN   = 'supplier_return',
  EXPIRY            = 'expiry',
  DAMAGE            = 'damage',
}

@Table({ tableName: 'stock_movements', modelName: 'StockMovement' })
export class StockMovement extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @ForeignKey(() => MedicalSupply) @AllowNull(false) @Column(DataType.UUID) supplyId!: string;
  @BelongsTo(() => MedicalSupply) supply!: MedicalSupply;
  @AllowNull(false) @Column(DataType.ENUM(...Object.values(MovementType))) type!: MovementType;
  @AllowNull(false) @Column(DataType.ENUM(...Object.values(MovementReason))) reason!: MovementReason;
  @AllowNull(false) @Min(1) @Column(DataType.INTEGER) quantity!: number;
  @AllowNull(false) @Column(DataType.INTEGER) stockBefore!: number;
  @AllowNull(false) @Column(DataType.INTEGER) stockAfter!: number;
  @Column(DataType.DECIMAL(10, 2)) unitCost?: number;
  @Column(DataType.STRING(100)) referenceNumber?: string;
  @Column(DataType.STRING(100)) area?: string;
  @Column(DataType.TEXT) notes?: string;
  @AllowNull(false) @Column(DataType.STRING(100)) performedBy!: string;
  @Default(DataType.NOW) @Column(DataType.DATE) performedAt!: Date;
}
