import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function buildUrl() {
  const url = new URL(process.env.DATABASE_URL!)
  url.searchParams.set('connection_limit', '10')
  url.searchParams.set('pool_timeout', '20')
  return url.toString()
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: buildUrl(),
  })

globalForPrisma.prisma = prisma
