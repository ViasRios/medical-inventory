import { Request, Response, NextFunction } from 'express';
import { SupplierService } from './supplier.service';
import { ResponseHelper } from '../../shared/utils/response.helper';

export class SupplierController {
  private service: SupplierService;
  constructor() { this.service = new SupplierService(); }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.created(res, await this.service.create(req.body), 'Proveedor registrado'); }
    catch (err) { next(err); }
  };
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = '1', limit = '20', search, active } = req.query;
      const result = await this.service.findAll({
        page: parseInt(page as string), limit: parseInt(limit as string),
        search: search as string,
        active: active !== undefined ? active === 'true' : undefined,
      });
      ResponseHelper.paginated(res, result.rows, result.count, parseInt(page as string), parseInt(limit as string));
    } catch (err) { next(err); }
  };
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.findById(req.params.id)); }
    catch (err) { next(err); }
  };
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.update(req.params.id, req.body), 'Proveedor actualizado'); }
    catch (err) { next(err); }
  };
  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.service.deactivate(req.params.id); ResponseHelper.success(res, null, 'Proveedor desactivado'); }
    catch (err) { next(err); }
  };
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.getSupplierStats(req.params.id)); }
    catch (err) { next(err); }
  };
}
