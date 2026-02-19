import { Response } from 'express';

export const success = (res: Response, data: any, meta?: any, status: number = 200) => {
  res.status(status).json({
    data,
    meta
  });
};

export const error = (res: Response, error: string, code: string, details?: any, status: number = 500) => {
  res.status(status).json({
    error,
    code,
    details
  });
};
