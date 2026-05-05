import { Router, Request, Response, NextFunction } from 'express';
import { AlertService, AlertLevel } from './alert.service';
import { ResponseHelper } from '../../shared/utils/response.helper';
import { authenticate } from '../../shared/middleware/auth.middleware';

const alertService = new AlertService();
const router = Router();
router.use(authenticate);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { level } = req.query;
    const alerts = level ? alertService.getAlertsByLevel(level as AlertLevel) : alertService.getActiveAlerts();
    ResponseHelper.success(res, alerts, `${alerts.length} alertas activas`);
  } catch (err) { next(err); }
});

router.delete('/:supplyId', (req: Request, res: Response, next: NextFunction) => {
  try { alertService.clearAlert(req.params.supplyId); ResponseHelper.success(res, null, 'Alerta despejada'); }
  catch (err) { next(err); }
});

export { router as alertsRouter };
