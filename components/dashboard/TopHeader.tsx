"use client";

import { Menu, PanelLeft, UserCircle, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebar } from "./SidebarContext";
import { NotificationPopover } from "./NotificationPopover";

interface TopHeaderProps {
  profile?: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  };
  unreadCount?: number;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordenador",
  TEACHER: "Professor",
};

export function TopHeader({ profile, unreadCount = 0 }: TopHeaderProps) {
  const { toggleSidebar, toggleMobile } = useSidebar();

  return (
    <header className="h-20 dashboard-glass border-b border-border/50 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobile}
          className="md:hidden text-foreground hover:bg-muted p-2 rounded-xl transition-colors outline-none"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden md:flex text-muted-foreground hover:text-primary p-2 rounded-xl hover:bg-primary/5 transition-all active:scale-95"
          title="Alternar Sidebar"
        >
          <PanelLeft size={20} />
        </button>
        <div className="hidden sm:block mt-1">
          <h2 className="text-sm font-extrabold text-foreground tracking-tight uppercase tracking-wider">
            samba edvance
          </h2>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">
            Simulados & Avaliações
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationPopover initialCount={unreadCount} />

        <ThemeToggle />

        <div className="h-8 w-px bg-border mx-1" />

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            title="Sair do sistema"
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut size={18} />
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-foreground leading-none">
              {profile?.full_name || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {roleLabel[profile?.role ?? ""] ?? profile?.role ?? ""}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full relative overflow-hidden ring-2 ring-primary/20 shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {profile?.full_name?.charAt(0) || (
                  <UserCircle size={20} className="opacity-50" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
