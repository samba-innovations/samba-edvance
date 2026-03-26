import { getItens, getDisciplinasSimples } from "@/lib/actions";
import { ItensClient } from "@/components/dashboard/itens/ItensClient";

interface Props {
  searchParams: Promise<{ page?: string; discipline_id?: string; search?: string }>;
}

export default async function ItensPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const disciplineId = params.discipline_id ? Number(params.discipline_id) : undefined;
  const search = params.search;

  const [{ rows, total }, disciplinas] = await Promise.all([
    getItens({ page, disciplineId, search }),
    getDisciplinasSimples(),
  ]);

  return (
    <ItensClient
      items={rows as any}
      total={total}
      page={page}
      disciplinas={disciplinas as any}
      filters={{ disciplineId: params.discipline_id, search }}
    />
  );
}
