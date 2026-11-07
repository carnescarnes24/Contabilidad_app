import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Conexión a la base de datos exitosa')
  } catch (e: any) {
    console.error('❌ Error de conexión:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()