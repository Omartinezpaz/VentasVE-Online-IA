import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Role } from '@ventasve/database';

export type AuthContext = {
  businessId: string;
  userId: string;
  role: Role;
  email: string;
  body: unknown;
  query: Record<string, string>;
  params: Record<string, string>;
  req: Request;
};

type AuthHandler<T> = (ctx: AuthContext) => Promise<T>;

export function authed<T>(handler: AuthHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.businessId) {
        return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      }
      const result = await handler({
        businessId: user.businessId,
        userId: user.userId,
        role: user.role,
        email: user.email,
        body: req.body,
        query: req.query as Record<string, string>,
        params: req.params,
        req,
      });
      if (result === undefined || result === null) {
        return res.status(204).send();
      }
      return res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export function authedWithStatus<T>(status: number, handler: AuthHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.businessId) {
        return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      }
      const result = await handler({
        businessId: user.businessId,
        userId: user.userId,
        role: user.role,
        email: user.email,
        body: req.body,
        query: req.query as Record<string, string>,
        params: req.params,
        req,
      });
      return res.status(status).json(result);
    } catch (error) {
      next(error);
    }
  };
}
