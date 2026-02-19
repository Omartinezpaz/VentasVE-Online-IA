import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { dashboardService } from '../services/dashboard.service';

const statsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional()
});

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { period } = statsQuerySchema.parse(req.query);
    const stats = await dashboardService.getStats(businessId, period);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
