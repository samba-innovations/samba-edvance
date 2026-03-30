import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function buildUrl() {
  const base = process.env.DATABASE_URL!
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}connection_limit=10&pool_timeout=20`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: buildUrl(),
  })

globalForPrisma.prisma = prisma
