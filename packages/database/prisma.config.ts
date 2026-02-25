import { defineConfig } from '@prisma/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL env var not set in packages/database/.env')
}

const pool = new Pool({
  connectionString,
})

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: connectionString,
  },
  migrate: {
    async adapter() {
      return new PrismaPg(pool)
    },
  },
})
