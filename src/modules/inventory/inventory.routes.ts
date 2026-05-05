import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware';
import { createSupplySchema, updateSupplySchema, stockMovementSchema } from './inventory.validation';

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

router.get('/', controller.getSupplies);
router.post('/', authorize('admin', 'manager'), validate(createSupplySchema), controller.createSupply);
router.get('/reports/low-stock', controller.getLowStockReport);
router.get('/reports/expiring', controller.getExpiringReport);
router.get('/reports/valuation', authorize('admin', 'manager'), controller.getValuationReport);
router.get('/:id', controller.getSupplyById);
router.put('/:id', authorize('admin', 'manager'), validate(updateSupplySchema), controller.updateSupply);
router.post('/:id/movements', validate(stockMovementSchema), controller.registerMovement);
router.get('/:id/movements', controller.getMovements);

export { router as inventoryRouter };
