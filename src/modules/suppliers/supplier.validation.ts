import Joi from 'joi';

export const createSupplierSchema = Joi.object({
  name: Joi.string().min(3).max(150).required(),
  rfc: Joi.string().pattern(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i).required()
    .messages({ 'string.pattern.base': 'RFC inválido. Formato: XXXX000000XXX' }),
  address: Joi.string().max(200).optional(),
  contactName: Joi.string().min(3).max(100).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-()]{7,20}$/).required(),
  email: Joi.string().email().max(150).required(),
  deliveryDays: Joi.number().integer().min(1).max(365).optional(),
  notes: Joi.string().max(500).optional(),
});

export const updateSupplierSchema = createSupplierSchema.fork(
  ['name', 'rfc', 'contactName', 'phone', 'email'],
  (field) => field.optional()
);
