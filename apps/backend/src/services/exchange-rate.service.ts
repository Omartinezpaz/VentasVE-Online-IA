import prisma from '@ventasve/database';
import { getRedis } from '../lib/redis';
import { Errors } from '../lib/errors';

const GLOBAL_KEY = 'exchange:current';

export class ExchangeRateService {
  async getCurrent(businessId?: string) {
    const redis = getRedis();
    const key = businessId ? `exchange:${businessId}` : GLOBAL_KEY;

    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const rate = await prisma.exchangeRate.findFirst({
      where: businessId ? { businessId } : { businessId: null },
      orderBy: { date: 'desc' }
    });

    if (!rate) {
      throw Errors.NotFound('Tasa de cambio');
    }

    await redis.set(key, JSON.stringify(rate), 'EX', 3600);
    return rate;
  }
}

export const exchangeRateService = new ExchangeRateService();

