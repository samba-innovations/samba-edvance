import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTurmas } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { TurmasClient } from "@/components/dashboard/turmas/TurmasClient";
import { TeacherTurmasClient } from "@/components/dashboard/turmas/TeacherTurmasClient";

export default async function TurmasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Coordenadores e admins: visão completa de todas as turmas
  if (session.role === "ADMIN" || session.role === "COORDINATOR") {
    const turmas = await getTurmas();
    return <TurmasClient turmas={turmas as any} />;
  }

  // Professores: apenas suas turmas atribuídas
  const rows = await prisma.$queryRaw<Array<{
    class_id: number; class_name: string; discipline_name: string;
  }>>`
    SELECT DISTINCT sc.id AS class_id, sc.name AS class_name, d.name AS discipline_name
    FROM samba_school.teacher_assignments ta
    JOIN samba_school.school_classes sc ON sc.id = ta.class_id
    JOIN samba_school.disciplines d ON d.id = ta.discipline_id
    WHERE ta.user_id = ${session.id}
    ORDER BY sc.name, d.name
  `;

  // Agrupa disciplinas por turma
  const classMap: Record<number, { class_id: number; class_name: string; disciplines: string[] }> = {};
  for (const row of rows) {
    if (!classMap[row.class_id]) {
      classMap[row.class_id] = { class_id: row.class_id, class_name: row.class_name, disciplines: [] };
    }
    classMap[row.class_id].disciplines.push(row.discipline_name);
  }

  const classes = Object.values(classMap);
  return <TeacherTurmasClient classes={classes} />;
}
