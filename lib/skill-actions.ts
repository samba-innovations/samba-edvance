'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getSkills(search?: string) {
  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    return prisma.$queryRaw<Array<{
      id: number; code: string; description: string; area: string | null; level: string | null
    }>>`
      SELECT id, code, description, area, level
      FROM samba_edvance.skills
      WHERE code ILIKE ${q} OR description ILIKE ${q} OR area ILIKE ${q}
      ORDER BY code ASC
      LIMIT 100
    `
  }
  return prisma.$queryRaw<Array<{
    id: number; code: string; description: string; area: string | null; level: string | null
  }>>`
    SELECT id, code, description, area, level
    FROM samba_edvance.skills
    ORDER BY code ASC
  `
}

export async function getSkillAreas() {
  const rows = await prisma.$queryRaw<Array<{ area: string | null; count: bigint }>>`
    SELECT area, COUNT(*) as count
    FROM samba_edvance.skills
    GROUP BY area
    ORDER BY area ASC
  `
  return rows.map(r => ({ area: r.area ?? 'Geral', count: Number(r.count) }))
}

export async function getExamSkills(examId: number) {
  return prisma.$queryRaw<Array<{
    skill_id: number; code: string; description: string; area: string | null
  }>>`
    SELECT s.id AS skill_id, s.code, s.description, s.area
    FROM samba_edvance.exam_skills es
    JOIN samba_edvance.skills s ON s.id = es.skill_id
    WHERE es.exam_id = ${examId}
    ORDER BY s.code ASC
  `
}

export async function setExamSkills(examId: number, skillIds: number[]) {
  const session = await import('@/lib/auth').then(m => m.getSession())
  if (!session) return { error: 'Não autenticado.' }
  await prisma.$executeRaw`
    DELETE FROM samba_edvance.exam_skills WHERE exam_id = ${examId}
  `
  for (const skillId of skillIds) {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.exam_skills (exam_id, skill_id)
      VALUES (${examId}, ${skillId})
      ON CONFLICT DO NOTHING
    `
  }
  revalidatePath(`/dashboard/simulados/${examId}`)
  return { success: true }
}

export async function getQuestionSkills(questionId: number) {
  return prisma.$queryRaw<Array<{
    skill_id: number; code: string; description: string; area: string | null
  }>>`
    SELECT s.id AS skill_id, s.code, s.description, s.area
    FROM samba_edvance.question_skills qs
    JOIN samba_edvance.skills s ON s.id = qs.skill_id
    WHERE qs.question_id = ${questionId}
    ORDER BY s.code ASC
  `
}

export async function setQuestionSkills(questionId: number, skillIds: number[]) {
  await prisma.$executeRaw`
    DELETE FROM samba_edvance.question_skills WHERE question_id = ${questionId}
  `
  for (const skillId of skillIds) {
    await prisma.$executeRaw`
      INSERT INTO samba_edvance.question_skills (question_id, skill_id)
      VALUES (${questionId}, ${skillId})
      ON CONFLICT DO NOTHING
    `
  }
  revalidatePath('/dashboard/simulados')
  return { success: true }
}
