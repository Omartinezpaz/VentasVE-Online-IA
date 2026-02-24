import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
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

function buildContext(req: Request): AuthContext | null {
  const user = (req as AuthRequest).user;
  if (!user?.businessId) return null;
  return {
    businessId: user.businessId,
    userId: user.userId,
    role: user.role,
    email: user.email,
    body: req.body,
    query: req.query as Record<string, string>,
    params: req.params,
    req,
  };
}

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: 'Datos inválidos',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors,
    });
  }
  next(error);
}

export function authed<T>(handler: AuthHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = buildContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      }
      const result = await handler(ctx);
      if (result === undefined || result === null) {
        return res.status(204).send();
      }
      return res.json(result);
    } catch (error) {
      handleError(error, res, next);
    }
  };
}

export function authedWithStatus<T>(status: number, handler: AuthHandler<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = buildContext(req);
      if (!ctx) {
        return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
      }
      const result = await handler(ctx);
      return res.status(status).json(result);
    } catch (error) {
      handleError(error, res, next);
    }
  };
}
