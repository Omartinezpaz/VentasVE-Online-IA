import { z } from 'zod';
import { exchangeRateService } from '../services/exchange-rate.service';
import { authed, authedWithStatus } from '../lib/handler';

const updateRateSchema = z.object({
  usdToVes: z.number().positive(),
  source: z.string().min(1)
});

export const getCurrentRate = authed(async ({ businessId }) => {
  return exchangeRateService.getCurrent(businessId);
});

export const updateRate = authedWithStatus(201, async ({ businessId, body }) => {
  const { usdToVes, source } = updateRateSchema.parse(body);
  return exchangeRateService.setCurrent(businessId, usdToVes, source);
});
