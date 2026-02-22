import { defineConfig, env } from '@prisma/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = env('DATABASE_URL')

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
