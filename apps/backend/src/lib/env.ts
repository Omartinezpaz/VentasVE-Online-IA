import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL:         z.string().url(),
  JWT_SECRET:           z.string().min(32),
  JWT_REFRESH_SECRET:   z.string().min(32),
  REDIS_URL:            z.string().url().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_R2_URL:    z.string().url().optional(),
  BCRYPT_ROUNDS:        z.coerce.number().default(12),
  NODE_ENV:             z.enum(['development', 'test', 'production']).default('development'),
  PORT:                 z.coerce.number().default(3001),
  BCV_RATE_URL:         z.string().url().optional(),
  FRONTEND_URL:         z.string().url().optional(),
});

export const env = EnvSchema.parse(process.env);
