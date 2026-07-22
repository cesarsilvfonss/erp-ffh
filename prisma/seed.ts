import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ffhasociados.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@ffhasociados.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log({ admin })

  // Create Default Currency PYG
  const currency = await prisma.currency.upsert({
    where: { code: 'PYG' },
    update: {},
    create: {
      name: 'Guaraní',
      code: 'PYG',
      symbol: '₲',
      exchangeRate: 1.0,
      isDefault: true,
    },
  })
  console.log({ currency })

  // Create Default Parameter for Merma (4%)
  const parameter = await prisma.parameter.upsert({
    where: { key: 'MERMA_DEFAULT' },
    update: {},
    create: {
      key: 'MERMA_DEFAULT',
      value: '4',
      description: 'Porcentaje de merma por defecto para compra de ganado en pie',
    },
  })
  console.log({ parameter })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
