"use client";

import { SidebarProvider } from "./SidebarContext";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { PageTransition } from "./PageTransition";
import { useSidebar } from "./SidebarContext";

interface DashboardShellProps {
  children: React.ReactNode;
  profile: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  };
  unreadCount?: number;
}

function DashboardContent({ children, profile, unreadCount = 0 }: DashboardShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background font-outfit relative">
      <Sidebar role={profile?.role} profile={profile} />

      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ minWidth: 0 }}
      >
        <TopHeader profile={profile} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto bg-muted/30 dark:bg-black/20 p-4 md:p-8 relative custom-scrollbar">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children, profile, unreadCount = 0 }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardContent profile={profile} unreadCount={unreadCount}>{children}</DashboardContent>
    </SidebarProvider>
  );
}
