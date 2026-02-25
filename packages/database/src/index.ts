import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
  
  const pool = new pg.Pool({
    connectionString,
    // Fix for Supabase Transaction Pooler (SSL self-signed certificate error)
    // Disable SSL for local connections
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export * from '@prisma/client';
