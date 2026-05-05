import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
}

declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    return;
  }
  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || 'default_secret';
  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

export function authorize(...roles: JwtPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'No tiene permisos para esta acción' });
      return;
    }
    next();
  };
}
