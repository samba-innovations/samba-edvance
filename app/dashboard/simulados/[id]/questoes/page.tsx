import { redirect } from "next/navigation";

interface Props { params: Promise<{ id: string }> }

export default async function QuestoesPage({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/simulados/${id}`);
}
