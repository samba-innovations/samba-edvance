import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getSimuladoById, getExamClasses, getExamQuotas,
  getExamTeacherAssignments, getExamQuestions,
  getAllClasses, getTeachersAll
} from "@/lib/exam-actions";
import { getDisciplinasSimples } from "@/lib/actions";
import { SimuladoCoordenaorPage } from "@/components/dashboard/simulados/SimuladoCoordenadorPage";
import { SimuladoProfessorPage } from "@/components/dashboard/simulados/SimuladoProfessorPage";
import { getMyAssignments, getMyQuestions } from "@/lib/exam-actions";

interface Props { params: Promise<{ id: string }> }

export default async function SimuladoDetalhePage({ params }: Props) {
  const { id } = await params;
  const examId = Number(id);

  const [session, simulado] = await Promise.all([getSession(), getSimuladoById(examId)]);

  if (!session) redirect("/login");
  if (!simulado) notFound();

  const isCoordinator = session.role === "ADMIN" || session.role === "COORDINATOR";

  if (isCoordinator) {
    const [classes, quotas, assignments, questions, allClasses, allTeachers, disciplinas] =
      await Promise.all([
        getExamClasses(examId),
        getExamQuotas(examId),
        getExamTeacherAssignments(examId),
        getExamQuestions(examId),
        getAllClasses(),
        getTeachersAll(),
        getDisciplinasSimples(),
      ]);

    return (
      <SimuladoCoordenaorPage
        simulado={simulado as any}
        classes={classes as any}
        quotas={quotas as any}
        assignments={assignments as any}
        questions={questions as any}
        allClasses={allClasses as any}
        allTeachers={allTeachers as any}
        disciplinas={disciplinas as any}
      />
    );
  }

  // Professor
  const [myAssignments, myQuestions] = await Promise.all([
    getMyAssignments(examId, session.id),
    getMyQuestions(examId, session.id),
  ]);

  return (
    <SimuladoProfessorPage
      simulado={simulado as any}
      assignments={myAssignments as any}
      questions={myQuestions as any}
      session={session}
    />
  );
}
