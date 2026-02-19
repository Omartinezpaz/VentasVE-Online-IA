import { Request, Response, NextFunction } from 'express';
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
  res.json({ message: 'Update manual exchange rate endpoint' });
};
