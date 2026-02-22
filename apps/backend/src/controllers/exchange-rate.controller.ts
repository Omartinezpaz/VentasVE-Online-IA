import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { exchangeRateService } from '../services/exchange-rate.service';
import { AuthRequest } from '../middleware/auth';

export const getCurrentRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user?.businessId;
    const rate = await exchangeRateService.getCurrent(businessId);
    res.json(rate);
  } catch (error) {
    next(error);
  }
};

export const updateRate = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const bodySchema = z.object({
    usdToVes: z.number().positive(),
    source: z.string().min(1)
  });

  const { usdToVes, source } = bodySchema.parse(req.body);

  const rate = await exchangeRateService.setCurrent(authReq.user?.businessId, usdToVes, source);
  res.status(201).json(rate);
};
