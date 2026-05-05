import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';
import { ResponseHelper } from '../../shared/utils/response.helper';

export class OrdersController {
  private service = new OrdersService();

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.created(res, await this.service.createOrder(req.body, req.user?.userId || 'system'), 'Orden creada'); }
    catch (err) { next(err); }
  };
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = '1', limit = '20', status, supplierId } = req.query;
      const result = await this.service.findAll({ page: parseInt(page as string), limit: parseInt(limit as string), status: status as any, supplierId: supplierId as string });
      ResponseHelper.paginated(res, result.rows, result.count, parseInt(page as string), parseInt(limit as string));
    } catch (err) { next(err); }
  };
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.findById(req.params.id)); }
    catch (err) { next(err); }
  };
  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.approveOrder(req.params.id, req.user?.userId || 'system'), 'Orden aprobada'); }
    catch (err) { next(err); }
  };
  receive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.receiveOrder(req.params.id, { ...req.body, receivedBy: req.user?.userId || 'system' }), 'Recepción registrada'); }
    catch (err) { next(err); }
  };
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.cancelOrder(req.params.id, req.user?.userId || 'system'), 'Orden cancelada'); }
    catch (err) { next(err); }
  };
}
