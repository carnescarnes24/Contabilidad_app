import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

config({ path: '.env.local', override: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})