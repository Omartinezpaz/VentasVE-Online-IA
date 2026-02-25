import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { dashboardService } from '../services/dashboard.service';

const statsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional(),
  seriesDays: z
    .preprocess(
      value => (typeof value === 'string' && value !== '' ? Number(value) : value),
      z.number().int().min(1).max(30).optional()
    )
});

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { period, seriesDays } = statsQuerySchema.parse(req.query);
    const stats = await dashboardService.getStats(businessId, period, seriesDays ?? 7);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const exportStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { seriesDays } = statsQuerySchema.parse(req.query);
    const days = seriesDays ?? 7;
    const series = await dashboardService.getSalesSeriesForExport(businessId, days);

    const header = ['date', 'usdCents', 'ves'];

    const escapeCsv = (value: unknown) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = series.map(entry => {
      const ves = entry.ves.toFixed(2);
      const row = [entry.date, entry.usdCents, ves];
      return row.map(escapeCsv).join(',');
    });

    const csv = [header.join(','), ...lines].join('\n');
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales-series-${days}d-${date}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
