import { getSimulados, getAllClasses, getMatrizesParaWizard } from "@/lib/exam-actions";
import { getDisciplinasSimples } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SimuladosClient } from "@/components/dashboard/simulados/SimuladosClient";

export default async function SimuladosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isCoordinator = session.role === "ADMIN" || session.role === "COORDINATOR";

  const [simulados, allClasses, disciplinas, matrizes] = await Promise.all([
    getSimulados(),
    isCoordinator ? getAllClasses() : Promise.resolve([]),
    isCoordinator ? getDisciplinasSimples() : Promise.resolve([]),
    isCoordinator ? getMatrizesParaWizard() : Promise.resolve([]),
  ]);

  return (
    <SimuladosClient
      simulados={simulados as any}
      isCoordinator={isCoordinator}
      allClasses={allClasses as any}
      disciplinas={disciplinas as any}
      matrizes={matrizes as any}
    />
  );
}
