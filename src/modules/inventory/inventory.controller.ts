import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { ResponseHelper } from '../../shared/utils/response.helper';
import { SupplyCategory } from './models/medical-supply.model';

export class InventoryController {
  private service: InventoryService;
  constructor() { this.service = new InventoryService(); }

  createSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.created(res, await this.service.createSupply(req.body), 'Insumo creado'); }
    catch (err) { next(err); }
  };
  getSupplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = '1', limit = '20', category, supplierId, lowStock, search } = req.query;
      const result = await this.service.findAll({
        page: parseInt(page as string), limit: parseInt(limit as string),
        category: category as SupplyCategory, supplierId: supplierId as string,
        lowStock: lowStock === 'true', search: search as string,
      });
      ResponseHelper.paginated(res, result.rows, result.count, parseInt(page as string), parseInt(limit as string));
    } catch (err) { next(err); }
  };
  getSupplyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.findById(req.params.id)); }
    catch (err) { next(err); }
  };
  updateSupply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.updateSupply(req.params.id, req.body), 'Insumo actualizado'); }
    catch (err) { next(err); }
  };
  registerMovement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const movement = await this.service.registerMovement({
        ...req.body, supplyId: req.params.id, performedBy: req.user?.userId || 'system',
      });
      ResponseHelper.created(res, movement, 'Movimiento registrado');
    } catch (err) { next(err); }
  };
  getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to } = req.query;
      const movements = await this.service.getMovementHistory(
        req.params.id,
        from ? new Date(from as string) : undefined,
        to ? new Date(to as string) : undefined
      );
      ResponseHelper.success(res, movements);
    } catch (err) { next(err); }
  };
  getLowStockReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplies = await this.service.getLowStockReport();
      ResponseHelper.success(res, supplies, `${supplies.length} insumos con stock bajo o crítico`);
    } catch (err) { next(err); }
  };
  getExpiringReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = parseInt((req.query.days as string) || '30');
      const supplies = await this.service.getExpiringSupplies(days);
      ResponseHelper.success(res, supplies, `${supplies.length} insumos próximos a caducar`);
    } catch (err) { next(err); }
  };
  getValuationReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { ResponseHelper.success(res, await this.service.getValuationReport()); }
    catch (err) { next(err); }
  };
}
