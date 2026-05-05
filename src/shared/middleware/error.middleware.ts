import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public isOperational = true) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} no encontrado`, 404); }
}
export class ValidationAppError extends AppError {
  constructor(message: string) { super(message, 400); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409); }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): Response {
  logger.error(`${req.method} ${req.path} - ${err.message}`);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  if (err instanceof ValidationError) {
    const errors = err.errors.map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Error de validación', errors });
  }
  return res.status(500).json({ success: false, message: 'Error interno del servidor' });
}
export function notFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({ success: false, message: `Ruta ${req.method} ${req.path} no encontrada` });
}
