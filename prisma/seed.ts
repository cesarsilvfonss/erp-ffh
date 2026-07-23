import * as dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString, ssl: true })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('123456', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ffhasociados.com' },
    update: { password: adminPassword },
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
