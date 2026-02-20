import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { env } from '../lib/env';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error('[ERROR]', requestId, err);
    }
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      field: err.field,
      requestId
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Ya existe un registro con esos datos',
      code: 'DUPLICATE_ENTRY',
      requestId
    });
  }

  console.error('[UNHANDLED ERROR]', requestId, err);
  return res.status(500).json({
    error: env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
    code: 'INTERNAL_ERROR',
    requestId
  });
};
