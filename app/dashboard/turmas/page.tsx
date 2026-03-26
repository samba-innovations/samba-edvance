import { getTurmas } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TurmasClient } from "@/components/dashboard/turmas/TurmasClient";

export default async function TurmasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "COORDINATOR") redirect("/dashboard");

  const turmas = await getTurmas();

  return <TurmasClient turmas={turmas as any} />;
}
