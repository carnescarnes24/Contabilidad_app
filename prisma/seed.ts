import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)

async function main() {
  // Limpieza total para re-ejecutar sin duplicados
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.thirdParty.deleteMany()
  await prisma.userBusiness.deleteMany()
  await prisma.appConfig.deleteMany()
  await prisma.user.deleteMany()
  await prisma.business.deleteMany()

  const password = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Administrador',
      password,
      role: 'ADMIN',
    },
  })

  // ============================================================
  // EMPRESA 1: Carnicería El Buen Corte
  // ============================================================
  const carneteria = await prisma.business.create({
    data: { name: 'Carnicería El Buen Corte', nit: '900111111-1' },
  })
  await prisma.userBusiness.create({
    data: { userId: admin.id, businessId: carneteria.id },
  })

  const c1_cli1 = await prisma.thirdParty.create({
    data: {
      businessId: carneteria.id,
      type: 'CLIENTE',
      docType: 'NIT',
      docNumber: '900555111-1',
      name: 'Restaurante La Parrilla',
      email: 'pagos@laparrilla.com',
      phone: '3105551234',
      address: 'Calle 45 #12-30, Bogotá',
    },
  })
  const c1_cli2 = await prisma.thirdParty.create({
    data: {
      businessId: carneteria.id,
      type: 'CLIENTE',
      docType: 'NIT',
      docNumber: '900555222-2',
      name: 'Asadero Don José',
      email: 'compras@donjose.com',
      phone: '3105555678',
      address: 'Carrera 7 #80-15, Bogotá',
    },
  })
  const c1_cli3 = await prisma.thirdParty.create({
    data: {
      businessId: carneteria.id,
      type: 'CLIENTE',
      docType: 'CC',
      docNumber: '79123456',
      name: 'María Fernanda Gómez',
      email: 'mf.gomez@correo.com',
      phone: '3205559012',
    },
  })
  const c1_prov1 = await prisma.thirdParty.create({
    data: {
      businessId: carneteria.id,
      type: 'PROVEEDOR',
      docType: 'NIT',
      docNumber: '800444111-1',
      name: 'Frigorífico Nacional',
      email: 'cartera@frigonacional.com',
      phone: '6014441111',
    },
  })
  const c1_prov2 = await prisma.thirdParty.create({
    data: {
      businessId: carneteria.id,
      type: 'PROVEEDOR',
      docType: 'NIT',
      docNumber: '800444222-2',
      name: 'Transportes El Toro',
      email: 'facturacion@eltoro.com',
      phone: '6014442222',
    },
  })

  // Facturas por cobrar — Carnicería
  const cobrarC1 = [
    { thirdPartyId: c1_cli1.id, number: 'FV-0001', amount: 1_850_000, issueDaysAgo: 40, dueOffset: 30, paidRatio: 1 },
    { thirdPartyId: c1_cli1.id, number: 'FV-0002', amount: 2_300_000, issueDaysAgo: 15, dueOffset: 20, paidRatio: 0.4 },
    { thirdPartyId: c1_cli2.id, number: 'FV-0003', amount: 950_000, issueDaysAgo: 60, dueOffset: 30, paidRatio: 0 },
    { thirdPartyId: c1_cli3.id, number: 'FV-0004', amount: 620_000, issueDaysAgo: 3, dueOffset: 30, paidRatio: 0 },
  ]
  for (const f of cobrarC1) {
    const issueDate = daysAgo(f.issueDaysAgo)
    const dueDate = daysAgo(f.issueDaysAgo - f.dueOffset)
    const paidAmount = Math.round(f.amount * f.paidRatio)
    const status =
      f.paidRatio === 1 ? 'PAGADA'
        : f.paidRatio > 0 ? 'PARCIAL'
          : dueDate < new Date() ? 'VENCIDA'
            : 'PENDIENTE'
    const inv = await prisma.invoice.create({
      data: {
        businessId: carneteria.id,
        thirdPartyId: f.thirdPartyId,
        type: 'COBRAR',
        number: f.number,
        issueDate,
        dueDate,
        amount: f.amount,
        paidAmount,
        status,
      },
    })
    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: paidAmount,
          date: daysAgo(Math.max(0, f.issueDaysAgo - 10)),
          method: 'Transferencia',
          createdBy: admin.id,
        },
      })
    }
  }

  // Facturas por pagar — Carnicería
  const pagarC1 = [
    { thirdPartyId: c1_prov1.id, number: 'FP-0001', amount: 3_200_000, issueDaysAgo: 50, dueOffset: 30, paidRatio: 0 },
    { thirdPartyId: c1_prov2.id, number: 'FP-0002', amount: 680_000, issueDaysAgo: 35, dueOffset: 15, paidRatio: 1 },
  ]
  for (const f of pagarC1) {
    const issueDate = daysAgo(f.issueDaysAgo)
    const dueDate = daysAgo(f.issueDaysAgo - f.dueOffset)
    const paidAmount = Math.round(f.amount * f.paidRatio)
    const status =
      f.paidRatio === 1 ? 'PAGADA'
        : dueDate < new Date() ? 'VENCIDA'
          : 'PENDIENTE'
    const inv = await prisma.invoice.create({
      data: {
        businessId: carneteria.id,
        thirdPartyId: f.thirdPartyId,
        type: 'PAGAR',
        number: f.number,
        issueDate,
        dueDate,
        amount: f.amount,
        paidAmount,
        status,
      },
    })
    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: paidAmount,
          date: daysAgo(Math.max(0, f.issueDaysAgo - 5)),
          method: 'PSE',
          createdBy: admin.id,
        },
      })
    }
  }

  // ============================================================
  // EMPRESA 2: Distribuidora La Res (clientes DIFERENTES)
  // ============================================================
  const distribuidora = await prisma.business.create({
    data: { name: 'Distribuidora La Res', nit: '900222222-2' },
  })
  await prisma.userBusiness.create({
    data: { userId: admin.id, businessId: distribuidora.id },
  })

  const c2_cli1 = await prisma.thirdParty.create({
    data: {
      businessId: distribuidora.id,
      type: 'CLIENTE',
      docType: 'NIT',
      docNumber: '901111111-1',
      name: 'Hotel Los Andes',
      email: 'compras@hotellosandes.com',
      phone: '3114441234',
      address: 'Carrera 10 #26-50, Bogotá',
    },
  })
  const c2_cli2 = await prisma.thirdParty.create({
    data: {
      businessId: distribuidora.id,
      type: 'CLIENTE',
      docType: 'NIT',
      docNumber: '901111222-2',
      name: 'Supermercado Central',
      email: 'pagos@supercentral.com',
      phone: '3114445678',
      address: 'Av. 68 #22-10, Bogotá',
    },
  })
  const c2_cli3 = await prisma.thirdParty.create({
    data: {
      businessId: distribuidora.id,
      type: 'CLIENTE',
      docType: 'CC',
      docNumber: '52789456',
      name: 'Carlos Andrés Ramírez',
      email: 'carlos.ramirez@correo.com',
      phone: '3214449012',
    },
  })
  const c2_prov1 = await prisma.thirdParty.create({
    data: {
      businessId: distribuidora.id,
      type: 'PROVEEDOR',
      docType: 'NIT',
      docNumber: '802222111-1',
      name: 'Empaques del Valle',
      email: 'ventas@empaquesvalle.com',
      phone: '6022221111',
    },
  })
  const c2_prov2 = await prisma.thirdParty.create({
    data: {
      businessId: distribuidora.id,
      type: 'PROVEEDOR',
      docType: 'NIT',
      docNumber: '802222222-2',
      name: 'Insumos Cárnicos SAS',
      email: 'cobranza@insumoscarnicos.com',
      phone: '6022222222',
    },
  })

  // Facturas por cobrar — Distribuidora
  const cobrarC2 = [
    { thirdPartyId: c2_cli1.id, number: 'FV-0001', amount: 4_500_000, issueDaysAgo: 20, dueOffset: 30, paidRatio: 0.5 },
    { thirdPartyId: c2_cli2.id, number: 'FV-0002', amount: 2_100_000, issueDaysAgo: 45, dueOffset: 30, paidRatio: 0 },
    { thirdPartyId: c2_cli2.id, number: 'FV-0003', amount: 1_350_000, issueDaysAgo: 10, dueOffset: 15, paidRatio: 0 },
    { thirdPartyId: c2_cli3.id, number: 'FV-0004', amount: 480_000, issueDaysAgo: 5, dueOffset: 30, paidRatio: 0 },
  ]
  for (const f of cobrarC2) {
    const issueDate = daysAgo(f.issueDaysAgo)
    const dueDate = daysAgo(f.issueDaysAgo - f.dueOffset)
    const paidAmount = Math.round(f.amount * f.paidRatio)
    const status =
      f.paidRatio === 1 ? 'PAGADA'
        : f.paidRatio > 0 ? 'PARCIAL'
          : dueDate < new Date() ? 'VENCIDA'
            : 'PENDIENTE'
    const inv = await prisma.invoice.create({
      data: {
        businessId: distribuidora.id,
        thirdPartyId: f.thirdPartyId,
        type: 'COBRAR',
        number: f.number,
        issueDate,
        dueDate,
        amount: f.amount,
        paidAmount,
        status,
      },
    })
    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: paidAmount,
          date: daysAgo(Math.max(0, f.issueDaysAgo - 10)),
          method: 'Transferencia',
          createdBy: admin.id,
        },
      })
    }
  }

  // Facturas por pagar — Distribuidora
  const pagarC2 = [
    { thirdPartyId: c2_prov1.id, number: 'FP-0001', amount: 1_800_000, issueDaysAgo: 25, dueOffset: 30, paidRatio: 0 },
    { thirdPartyId: c2_prov2.id, number: 'FP-0002', amount: 2_950_000, issueDaysAgo: 40, dueOffset: 20, paidRatio: 0 },
  ]
  for (const f of pagarC2) {
    const issueDate = daysAgo(f.issueDaysAgo)
    const dueDate = daysAgo(f.issueDaysAgo - f.dueOffset)
    const paidAmount = Math.round(f.amount * f.paidRatio)
    const status =
      f.paidRatio === 1 ? 'PAGADA'
        : dueDate < new Date() ? 'VENCIDA'
          : 'PENDIENTE'
    const inv = await prisma.invoice.create({
      data: {
        businessId: distribuidora.id,
        thirdPartyId: f.thirdPartyId,
        type: 'PAGAR',
        number: f.number,
        issueDate,
        dueDate,
        amount: f.amount,
        paidAmount,
        status,
      },
    })
    if (paidAmount > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount: paidAmount,
          date: daysAgo(Math.max(0, f.issueDaysAgo - 5)),
          method: 'PSE',
          createdBy: admin.id,
        },
      })
    }
  }

  console.log('✅ Seed OK — login: admin@demo.com / admin123')
  console.log('   Negocio 1: Carnicería El Buen Corte (3 clientes, 2 proveedores)')
  console.log('   Negocio 2: Distribuidora La Res (3 clientes, 2 proveedores)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())