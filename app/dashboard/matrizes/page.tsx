import { getMatrizes, getDisciplinasSimples } from "@/lib/actions";
import { MatrizesClient } from "@/components/dashboard/matrizes/MatrizesClient";

export default async function MatrizesPage() {
  const [matrizes, disciplinas] = await Promise.all([
    getMatrizes(),
    getDisciplinasSimples(),
  ]);

  return (
    <MatrizesClient
      matrizes={matrizes as any}
      disciplinas={disciplinas as any}
    />
  );
}
