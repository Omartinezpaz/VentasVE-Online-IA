import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;

export const getRedis = () => {
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL no está configurado');
  }

  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
  }

  return client;
};

