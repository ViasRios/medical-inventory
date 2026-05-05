import { Response } from 'express';
export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    return res.status(statusCode).json({ success: true, data, message });
  }
  static created<T>(res: Response, data: T, message = 'Creado exitosamente'): Response {
    return res.status(201).json({ success: true, data, message });
  }
  static paginated<T>(res: Response, data: T[], total: number, page: number, limit: number): Response {
    return res.status(200).json({
      success: true, data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }
  static error(res: Response, message: string, statusCode = 500, errors?: string[]): Response {
    return res.status(statusCode).json({ success: false, message, errors });
  }
  static notFound(res: Response, message = 'No encontrado'): Response {
    return res.status(404).json({ success: false, message });
  }
  static badRequest(res: Response, message: string, errors?: string[]): Response {
    return res.status(400).json({ success: false, message, errors });
  }
  static unauthorized(res: Response, message = 'No autorizado'): Response {
    return res.status(401).json({ success: false, message });
  }
  static forbidden(res: Response, message = 'Acceso denegado'): Response {
    return res.status(403).json({ success: false, message });
  }
}
