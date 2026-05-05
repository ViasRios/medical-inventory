import Joi from 'joi';

export const createOrderSchema = Joi.object({
  supplierId: Joi.string().uuid().required(),
  expectedDeliveryDate: Joi.date().iso().optional(),
  notes: Joi.string().max(500).optional(),
  items: Joi.array().items(Joi.object({
    supplyId: Joi.string().uuid().required(),
    quantityOrdered: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().precision(2).min(0).required(),
    discount: Joi.number().min(0).max(100).optional(),
  })).min(1).required(),
});

export const receiveOrderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    orderItemId: Joi.string().uuid().required(),
    quantityReceived: Joi.number().integer().min(1).required(),
    lotNumber: Joi.string().max(100).optional(),
    expirationDate: Joi.date().iso().optional(),
  })).min(1).required(),
  notes: Joi.string().max(500).optional(),
});
