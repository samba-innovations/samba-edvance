import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [rows, unreadCount] = await Promise.all([
    prisma.$queryRaw<Array<{ avatar_url: string | null }>>`
      SELECT avatar_url FROM samba_school.users WHERE id = ${session.id}
    `,
    (prisma.notification?.count({ where: { userId: session.id, isRead: false } }) ?? Promise.resolve(0)),
  ]);

  const profile = {
    full_name: session.name,
    role: session.role,
    avatar_url: rows[0]?.avatar_url ?? null,
  };

  return (
    <DashboardShell profile={profile} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}
