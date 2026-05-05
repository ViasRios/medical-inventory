import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { createOrderSchema, receiveOrderSchema } from './orders.validation';

const router = Router();
const controller = new OrdersController();

router.use(authenticate);
router.get('/', controller.getAll);
router.post('/', authorize('admin', 'manager'), validate(createOrderSchema), controller.create);
router.get('/:id', controller.getById);
router.patch('/:id/approve', authorize('admin', 'manager'), controller.approve);
router.patch('/:id/receive', validate(receiveOrderSchema), controller.receive);
router.patch('/:id/cancel', authorize('admin', 'manager'), controller.cancel);

export { router as ordersRouter };
