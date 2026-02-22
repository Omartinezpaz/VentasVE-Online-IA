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

    const where = businessId ? { businessId } : { businessId: null };

    let rate = await prisma.exchangeRate.findFirst({
      where,
      orderBy: { date: 'desc' }
    });

    if (!rate && businessId) {
      rate = await prisma.exchangeRate.findFirst({
        where: { businessId: null },
        orderBy: { date: 'desc' }
      });
    }

    if (!rate) {
      throw Errors.NotFound('Tasa de cambio');
    }

    await redis.set(key, JSON.stringify(rate), 'EX', 3600);
    return rate;
  }

  async setCurrent(businessId: string | undefined, usdToVes: number, source: string) {
    const redis = getRedis();
    const key = businessId ? `exchange:${businessId}` : GLOBAL_KEY;

    const data = {
      businessId: businessId ?? null,
      usdToVes,
      source,
      date: new Date()
    };

    const rate = await prisma.exchangeRate.create({ data });
    await redis.del(key);
    return rate;
  }
}

export const exchangeRateService = new ExchangeRateService();
