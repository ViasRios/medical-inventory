import { Router } from 'express';
import { SupplierController } from './supplier.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { createSupplierSchema, updateSupplierSchema } from './supplier.validation';

const router = Router();
const controller = new SupplierController();

router.use(authenticate);
router.get('/', controller.getAll);
router.post('/', authorize('admin', 'manager'), validate(createSupplierSchema), controller.create);
router.get('/:id', controller.getById);
router.get('/:id/stats', controller.getStats);
router.put('/:id', authorize('admin', 'manager'), validate(updateSupplierSchema), controller.update);
router.delete('/:id', authorize('admin'), controller.deactivate);

export { router as suppliersRouter };
