import { notFound } from "next/navigation";
import { getItemById, getDisciplinasSimples, getHabilidades, atualizarItem } from "@/lib/actions";
import { ItemFormClient } from "@/components/dashboard/itens/ItemFormClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarItemPage({ params }: Props) {
  const { id } = await params;
  const [item, disciplinas, skills] = await Promise.all([
    getItemById(Number(id)),
    getDisciplinasSimples(),
    getHabilidades(),
  ]);

  if (!item) notFound();

  const action = atualizarItem.bind(null, Number(id));

  return (
    <ItemFormClient
      action={action}
      disciplinas={disciplinas as any}
      skills={skills as any}
      initialData={item as any}
      mode="edit"
    />
  );
}
