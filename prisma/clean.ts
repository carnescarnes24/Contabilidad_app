import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando limpieza de datos de demostración...')
  
  // El orden importa por las llaves foráneas
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.thirdParty.deleteMany()
  await prisma.userBusiness.deleteMany()
  await prisma.appConfig.deleteMany()
  
  // Opcional: Si quieres borrar TODOS los negocios también
  await prisma.business.deleteMany()

  // NO borramos la tabla User para mantener tu acceso
  // Pero sí podemos asegurarnos de que el admin siga ahí
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.log('⚠️ No se encontró usuario ADMIN. Deberás crear uno nuevo.')
  } else {
    console.log(`✅ Usuario administrador conservado: ${admin.email}`)
  }

  console.log('✅ Limpieza completada. La base de datos está lista para datos reales.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())