import {
  Table, Column, Model, DataType, PrimaryKey, Default,
  HasMany, Unique, AllowNull,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'suppliers', modelName: 'Supplier' })
export class Supplier extends Model {
  @PrimaryKey @Default(uuidv4) @Column(DataType.UUID) id!: string;
  @AllowNull(false) @Unique @Column(DataType.STRING(150)) name!: string;
  @AllowNull(false) @Unique @Column(DataType.STRING(13)) rfc!: string;
  @Column(DataType.STRING(200)) address?: string;
  @AllowNull(false) @Column(DataType.STRING(100)) contactName!: string;
  @AllowNull(false) @Column(DataType.STRING(20)) phone!: string;
  @AllowNull(false) @Column(DataType.STRING(150)) email!: string;
  @Default(true) @Column(DataType.BOOLEAN) active!: boolean;
  @Column(DataType.INTEGER) deliveryDays?: number;
  @Column(DataType.TEXT) notes?: string;
}
