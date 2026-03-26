import { getAlunos, getTurmas } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlunosClient } from "@/components/dashboard/alunos/AlunosClient";

interface Props { searchParams: Promise<{ q?: string; class_id?: string }> }

export default async function AlunosPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") redirect("/dashboard");

  const { q, class_id } = await searchParams;
  const classId = class_id ? Number(class_id) : undefined;

  const [alunos, turmas] = await Promise.all([
    getAlunos(q, classId),
    getTurmas(),
  ]);

  return (
    <AlunosClient
      alunos={alunos as any}
      turmas={turmas as any}
      currentSearch={q ?? ""}
      currentClassId={classId}
    />
  );
}
