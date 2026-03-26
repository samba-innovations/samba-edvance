import { getTurmaById, getTurmaStudents, getTurmaTeachers, getTurmaSimulados } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { TurmaDetalheClient } from "@/components/dashboard/turmas/TurmaDetalheClient";

interface Props { params: Promise<{ id: string }> }

export default async function TurmaDetalhePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") redirect("/dashboard");

  const { id } = await params;
  const classId = Number(id);

  const [turma, students, teachers, simulados] = await Promise.all([
    getTurmaById(classId),
    getTurmaStudents(classId),
    getTurmaTeachers(classId),
    getTurmaSimulados(classId),
  ]);

  if (!turma) notFound();

  return (
    <TurmaDetalheClient
      turma={turma as any}
      students={students as any}
      teachers={teachers as any}
      simulados={simulados as any}
    />
  );
}
