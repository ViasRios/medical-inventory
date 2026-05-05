import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  BelongsTo, ForeignKey, HasMany, AllowNull, Min,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Supplier } from '../../suppliers/models/supplier.model';

export enum SupplyCategory {
  CONSUMABLE = 'consumable',
  MEDICATION  = 'medication',
  EQUIPMENT   = 'equipment',
  DIAGNOSTIC  = 'diagnostic',
  SURGICAL    = 'surgical',
  PPE         = 'ppe',
}

export enum StorageCondition {
  ROOM_TEMP  = 'room_temperature',
  REFRIGERATED = 'refrigerated',
  FROZEN     = 'frozen',
  CONTROLLED = 'controlled',
}

@Table({ tableName: 'medical_supplies', modelName: 'MedicalSupply' })
export class MedicalSupply extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @AllowNull(false) @Column(DataType.STRING(50)) sku!: string;
  @AllowNull(false) @Column(DataType.STRING(200)) name!: string;
  @Column(DataType.TEXT) description?: string;
  @AllowNull(false) @Column(DataType.ENUM(...Object.values(SupplyCategory))) category!: SupplyCategory;
  @AllowNull(false) @Column(DataType.STRING(30)) unit!: string;
  @Min(0) @Default(0) @Column(DataType.INTEGER) currentStock!: number;
  @Min(0) @Default(10) @Column(DataType.INTEGER) minStock!: number;
  @Min(0) @Default(5) @Column(DataType.INTEGER) criticalStock!: number;
  @Column(DataType.INTEGER) maxStock?: number;
  @Min(0) @Column(DataType.DECIMAL(10, 2)) unitCost!: number;
  @Column(DataType.DATE) expirationDate?: Date;
  @Column(DataType.STRING(100)) lotNumber?: string;
  @Default(StorageCondition.ROOM_TEMP)
  @Column(DataType.ENUM(...Object.values(StorageCondition))) storageCondition!: StorageCondition;
  @Column(DataType.STRING(100)) manufacturer?: string;
  @Column(DataType.STRING(50)) registroSanitario?: string;
  @Default(true) @Column(DataType.BOOLEAN) active!: boolean;
  @ForeignKey(() => Supplier) @Column(DataType.UUID) supplierId?: string;
  @BelongsTo(() => Supplier) supplier?: Supplier;

  get stockStatus(): 'normal' | 'low' | 'critical' | 'out_of_stock' {
    if (this.currentStock === 0) return 'out_of_stock';
    if (this.currentStock <= this.criticalStock) return 'critical';
    if (this.currentStock <= this.minStock) return 'low';
    return 'normal';
  }
}
