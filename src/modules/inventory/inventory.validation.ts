import Joi from 'joi';
import { SupplyCategory, StorageCondition } from './models/medical-supply.model';
import { MovementType, MovementReason } from './models/stock-movement.model';

export const createSupplySchema = Joi.object({
  sku: Joi.string().alphanum().max(50).uppercase().required(),
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid(...Object.values(SupplyCategory)).required(),
  unit: Joi.string().max(30).required(),
  minStock: Joi.number().integer().min(0).default(10),
  criticalStock: Joi.number().integer().min(0).default(5),
  maxStock: Joi.number().integer().min(1).optional(),
  unitCost: Joi.number().precision(2).min(0).required(),
  expirationDate: Joi.date().iso().optional(),
  lotNumber: Joi.string().max(100).optional(),
  storageCondition: Joi.string().valid(...Object.values(StorageCondition)).default(StorageCondition.ROOM_TEMP),
  manufacturer: Joi.string().max(100).optional(),
  registroSanitario: Joi.string().max(50).optional(),
  supplierId: Joi.string().uuid().optional(),
});

export const updateSupplySchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid(...Object.values(SupplyCategory)).optional(),
  unit: Joi.string().max(30).optional(),
  minStock: Joi.number().integer().min(0).optional(),
  criticalStock: Joi.number().integer().min(0).optional(),
  maxStock: Joi.number().integer().min(1).optional(),
  unitCost: Joi.number().precision(2).min(0).optional(),
  expirationDate: Joi.date().iso().optional(),
  lotNumber: Joi.string().max(100).optional(),
  storageCondition: Joi.string().valid(...Object.values(StorageCondition)).optional(),
  manufacturer: Joi.string().max(100).optional(),
  registroSanitario: Joi.string().max(50).optional(),
  supplierId: Joi.string().uuid().optional(),
  active: Joi.boolean().optional(),
});

export const stockMovementSchema = Joi.object({
  type: Joi.string().valid(...Object.values(MovementType)).required(),
  reason: Joi.string().valid(...Object.values(MovementReason)).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitCost: Joi.number().precision(2).min(0).optional(),
  referenceNumber: Joi.string().max(100).optional(),
  area: Joi.string().max(100).optional(),
  notes: Joi.string().max(500).optional(),
});
