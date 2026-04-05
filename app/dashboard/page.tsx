import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoordinatorDashboard } from "@/components/dashboard/CoordinatorDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { prisma } from "@/lib/db";

async function getCoordinatorStats() {
  const [simulados, itens, matrizes] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint; collecting: bigint; locked: bigint }]>`
      SELECT
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE status = 'collecting') AS collecting,
        COUNT(*) FILTER (WHERE status = 'locked') AS locked
      FROM samba_edvance.exams
    `,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) AS count FROM samba_edvance.items`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) AS count FROM samba_edvance.blueprints`,
  ]);

  const recentExams = await prisma.$queryRaw<Array<{
    id: number; title: string; status: string; created_at: Date; question_count: number;
    total_quota: number; total_submitted: number;
  }>>`
    SELECT
      e.id, e.title, e.status, e.created_at,
      (SELECT COUNT(*) FROM samba_edvance.questions q WHERE q.exam_id = e.id)::int AS question_count,
      COALESCE((SELECT SUM(quota) FROM samba_edvance.exam_discipline_quotas edq WHERE edq.exam_id = e.id), 0)::int AS total_quota,
      (SELECT COUNT(*) FROM samba_edvance.questions q WHERE q.exam_id = e.id)::int AS total_submitted
    FROM samba_edvance.exams e
    ORDER BY e.created_at DESC
    LIMIT 6
  `;

  const pendingProgress = await prisma.$queryRaw<Array<{
    exam_id: number; exam_title: string; teacher_name: string;
    discipline_name: string; class_name: string;
    submitted: number; quota: number; status: string;
  }>>`
    SELECT
      e.id AS exam_id, e.title AS exam_title,
      u.name AS teacher_name, d.name AS discipline_name,
      sc.name AS class_name,
      etp.submitted, etp.quota, etp.status
    FROM samba_edvance.exam_teacher_progress etp
    JOIN samba_edvance.exams e ON e.id = etp.exam_id
    JOIN samba_school.users u ON u.id = etp.teacher_id
    JOIN samba_school.disciplines d ON d.id = etp.discipline_id
    JOIN samba_school.school_classes sc ON sc.id = etp.class_id
    WHERE etp.status != 'complete' AND e.status = 'collecting'
    ORDER BY e.created_at DESC
    LIMIT 8
  `;

  return {
    totalSimulados: Number(simulados[0]?.count ?? 0),
    collecting: Number(simulados[0]?.collecting ?? 0),
    locked: Number(simulados[0]?.locked ?? 0),
    totalItens: Number(itens[0]?.count ?? 0),
    totalMatrizes: Number(matrizes[0]?.count ?? 0),
    recentExams: recentExams as any[],
    pendingProgress: pendingProgress as any[],
  };
}

async function getTeacherStats(userId: number) {
  const assignments = await prisma.$queryRaw<Array<{
    exam_id: number; exam_title: string; exam_status: string;
    discipline_name: string; class_name: string;
    submitted: number; quota: number; progress_status: string;
  }>>`
    SELECT
      e.id AS exam_id, e.title AS exam_title, e.status AS exam_status,
      d.name AS discipline_name, sc.name AS class_name,
      COALESCE(etp.submitted, 0) AS submitted,
      COALESCE(etp.quota, 0) AS quota,
      COALESCE(etp.status, 'pending') AS progress_status
    FROM samba_edvance.exam_teacher_assignments eta
    JOIN samba_edvance.exams e ON e.id = eta.exam_id
    JOIN samba_school.disciplines d ON d.id = eta.discipline_id
    JOIN samba_school.school_classes sc ON sc.id = eta.class_id
    LEFT JOIN samba_edvance.exam_teacher_progress etp
      ON etp.exam_id = eta.exam_id
      AND etp.teacher_id = ${userId}
      AND etp.discipline_id = eta.discipline_id
      AND etp.class_id = eta.class_id
    WHERE eta.teacher_id = ${userId}
    ORDER BY e.created_at DESC
  `;

  const myQuestions = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count FROM samba_edvance.questions WHERE teacher_id = ${userId}
  `;

  const myClasses = await prisma.$queryRaw<Array<{ class_name: string; discipline_name: string }>>`
    SELECT sc.name AS class_name, d.name AS discipline_name
    FROM samba_school.teacher_assignments ta
    JOIN samba_school.school_classes sc ON sc.id = ta.class_id
    JOIN samba_school.disciplines d ON d.id = ta.discipline_id
    WHERE ta.user_id = ${userId}
    ORDER BY sc.name, d.name
  `;

  return {
    assignments: assignments as any[],
    myQuestions: Number(myQuestions[0]?.count ?? 0),
    myClasses: myClasses as any[],
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isCoordinator = session.role === "ADMIN" || session.role === "COORDINATOR";

  if (isCoordinator) {
    const stats = await getCoordinatorStats();
    return <CoordinatorDashboard session={session} stats={stats} />;
  }

  const stats = await getTeacherStats(session.id);
  return <TeacherDashboard session={session} stats={stats} />;
}
