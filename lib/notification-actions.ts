'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── Leitura ──────────────────────────────────────────────────────────────────

export async function getNotifications() {
  const session = await getSession()
  if (!session || !prisma.notification) return []

  return prisma.notification.findMany({
    where:   { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take:    30,
  })
}

export async function getUnreadCount() {
  const session = await getSession()
  if (!session || !prisma.notification) return 0

  return prisma.notification.count({
    where: { userId: session.id, isRead: false },
  })
}

// ─── Marcação ─────────────────────────────────────────────────────────────────

export async function markAsRead(id: number) {
  const session = await getSession()
  if (!session || !prisma.notification) return

  await prisma.notification.updateMany({
    where: { id, userId: session.id },
    data:  { isRead: true },
  })
  revalidatePath('/dashboard')
}

export async function markAllAsRead() {
  const session = await getSession()
  if (!session || !prisma.notification) return

  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data:  { isRead: true },
  })
  revalidatePath('/dashboard')
}

// ─── Criação (uso interno nas actions) ────────────────────────────────────────

export async function createNotification(data: {
  userId:  number
  title:   string
  message?: string
  link?:   string
}) {
  if (!prisma.notification) return
  return prisma.notification.create({ data })
}

export async function createNotificationMany(data: Array<{
  userId:  number
  title:   string
  message?: string
  link?:   string
}>) {
  if (data.length === 0 || !prisma.notification) return
  return prisma.notification.createMany({ data })
}

// ─── Helpers para notificar grupos ───────────────────────────────────────────

export async function notifyCoordinators(title: string, message: string, link?: string) {
  if (!prisma.notification) return
  const users = await prisma.user.findMany({
    where: {
      isActive:  true,
      userRoles: { some: { role: { name: { in: ['COORDINATOR', 'ADMIN'] } } } },
    },
    select: { id: true },
  })
  if (users.length === 0) return
  await prisma.notification.createMany({
    data: users.map(u => ({ userId: u.id, title, message, link })),
  })
}

export async function notifyUser(userId: number, title: string, message: string, link?: string) {
  if (!prisma.notification) return
  await prisma.notification.create({
    data: { userId, title, message, link },
  })
}
