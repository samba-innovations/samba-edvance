import { getDisciplinasSimples, getHabilidades, criarItem } from "@/lib/actions";
import { ItemFormClient } from "@/components/dashboard/itens/ItemFormClient";

export default async function NovoItemPage() {
  const [disciplinas, skills] = await Promise.all([
    getDisciplinasSimples(),
    getHabilidades(),
  ]);

  return (
    <ItemFormClient
      action={criarItem}
      disciplinas={disciplinas as any}
      skills={skills as any}
      mode="create"
    />
  );
}
