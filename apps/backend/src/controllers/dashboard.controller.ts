import { z } from 'zod';
import { dashboardService } from '../services/dashboard.service';
import { authed } from '../lib/handler';

const statsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional()
});

export const getStats = authed(async ({ businessId, query }) => {
  const { period } = statsQuerySchema.parse(query);
  return dashboardService.getStats(businessId, period);
});
