"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  LayoutTemplate,
  BookOpen,
  Users,
  GraduationCap,
  LogOut,
  UserCircle,
  X,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "./SidebarContext";

interface SidebarProps {
  role?: string;
  profile?: {
    full_name?: string;
    email?: string;
    role?: string;
    avatar_url?: string | null;
  };
}

export function Sidebar({ role, profile }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleMobile } = useSidebar();

  const isAdmin = role === "ADMIN" || role === "COORDINATOR";

  const NavLink = ({
    href,
    icon: Icon,
    label,
    active,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      onClick={() => isMobileOpen && toggleMobile()}
      className="relative group block"
    >
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
          active
            ? "text-primary bg-primary/10 shadow-[0_4px_20px_rgba(0,87,122,0.08)]"
            : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
        }`}
      >
        <Icon
          size={18}
          className={`${
            active
              ? "text-primary"
              : "text-foreground/40 group-hover:text-foreground/70"
          } shrink-0`}
        />
        <span
          className={`truncate whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? "md:opacity-0 md:w-0 overflow-hidden" : "opacity-100"
          }`}
        >
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="sidebar-active-edvance"
            className="absolute left-0 w-1.5 h-6 bg-primary rounded-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </div>
    </Link>
  );

  const SidebarContent = (
    <>
      {/* Header / Logo */}
      <div
        className={`h-24 flex items-center shrink-0 transition-all duration-300 ${
          isCollapsed ? "md:justify-center" : "px-8"
        }`}
      >
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="hidden md:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imgs/edvance-logo2.svg"
                alt="Samba Edvance"
                className="w-10 h-10 drop-shadow-md"
              />
            </motion.div>
          ) : (
            <motion.div
              key="logo-expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <div className="flex items-center justify-between w-full md:block">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/imgs/edvance-logotipo.svg"
                    alt="Samba Edvance"
                    className="h-8 w-auto dark:hidden"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/imgs/edvance-logotipo2.svg"
                    alt="Samba Edvance"
                    className="h-8 w-auto hidden dark:block drop-shadow-md"
                  />
                </div>
                <button
                  onClick={toggleMobile}
                  className="md:hidden p-2 text-foreground/40 hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8 custom-scrollbar overflow-x-hidden">
        {/* Principal */}
        <div>
          <p
            className={`px-5 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300 ${
              isCollapsed
                ? "md:opacity-0 md:h-0 overflow-hidden"
                : "opacity-100"
            }`}
          >
            Principal
          </p>
          <nav className="space-y-1">
            <NavLink
              href="/dashboard"
              icon={LayoutDashboard}
              label="Visão Geral"
              active={pathname === "/dashboard"}
            />
            <NavLink
              href="/dashboard/simulados"
              icon={ClipboardList}
              label="Simulados"
              active={pathname.startsWith("/dashboard/simulados")}
            />
            <NavLink
              href="/dashboard/matrizes"
              icon={LayoutTemplate}
              label="Matrizes"
              active={pathname.startsWith("/dashboard/matrizes")}
            />
          </nav>
        </div>

        {/* Configurações (admin/coordinator) */}
        {isAdmin && (
          <div>
            <p
              className={`px-5 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300 ${
                isCollapsed
                  ? "md:opacity-0 md:h-0 overflow-hidden"
                  : "opacity-100"
              }`}
            >
              Configurações
            </p>
            <nav className="space-y-1">
              <NavLink
                href="/dashboard/disciplinas"
                icon={BookOpen}
                label="Disciplinas"
                active={pathname.startsWith("/dashboard/disciplinas")}
              />
              <NavLink
                href="/dashboard/turmas"
                icon={Users}
                label="Turmas"
                active={pathname.startsWith("/dashboard/turmas")}
              />
              <NavLink
                href="/dashboard/alunos"
                icon={GraduationCap}
                label="Alunos"
                active={pathname.startsWith("/dashboard/alunos")}
              />
            </nav>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-border/50 bg-muted/10 mt-auto shrink-0">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={`flex items-center justify-center h-12 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isCollapsed
                ? "md:w-12 md:mx-auto md:px-0"
                : "w-full gap-3 px-4"
            }`}
          >
            <LogOut size={16} />
            <span className={isCollapsed ? "md:hidden" : ""}>
              Sair do Sistema
            </span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 100 : 288 }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="dashboard-glass border-r border-border/50 h-full flex-col hidden md:flex shrink-0 z-30 relative overflow-hidden"
      >
        {SidebarContent}
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-background border-r border-border z-[70] md:hidden flex flex-col overflow-hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
