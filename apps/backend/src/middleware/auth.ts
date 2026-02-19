import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';
import { Role } from '@ventasve/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    businessId: string;
    role: Role;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token', code: 'INVALID_TOKEN' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    next();
  };
};
