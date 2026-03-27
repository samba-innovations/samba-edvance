"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle,
  ChevronRight, FileText, Users, BookOpen,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const examStatusConfig: Record<string, { label: string; class: string; border: string }> = {
  draft:      { label: "Rascunho",  class: "bg-muted text-muted-foreground",                                   border: "border-l-border" },
  collecting: { label: "Coletando", class: "bg-secondary/10 text-secondary",                                   border: "border-l-secondary/60" },
  review:     { label: "Revisão",   class: "bg-amber-500/10 text-amber-600 dark:text-amber-400",               border: "border-l-amber-400" },
  locked:     { label: "Travado",   class: "bg-primary/10 text-primary",                                       border: "border-l-primary" },
  generated:  { label: "Gerado",    class: "bg-teal-500/10 text-teal-600 dark:text-teal-400",                  border: "border-l-teal-500" },
  published:  { label: "Publicado", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",         border: "border-l-emerald-500" },
  archived:   { label: "Arquivado", class: "bg-muted text-muted-foreground/60",                                border: "border-l-border/40" },
};

const progressConfig: Record<string, { label: string; icon: React.ElementType; barColor: string; textColor: string }> = {
  pending:  { label: "Pendente", icon: Clock,        barColor: "bg-muted-foreground/30", textColor: "text-muted-foreground" },
  partial:  { label: "Parcial",  icon: AlertCircle,  barColor: "bg-secondary",           textColor: "text-secondary" },
  complete: { label: "Completo", icon: CheckCircle2, barColor: "bg-emerald-500",         textColor: "text-emerald-600 dark:text-emerald-400" },
  done:     { label: "Enviado",  icon: CheckCircle2, barColor: "bg-emerald-500",         textColor: "text-emerald-600 dark:text-emerald-400" },
};

interface Stats {
  assignments: Array<{
    exam_id: number; exam_title: string; exam_status: string;
    discipline_name: string; class_name: string;
    submitted: number; quota: number; progress_status: string;
  }>;
  myQuestions: number;
  myClasses: Array<{ class_name: string; discipline_name: string }>;
}

export function TeacherDashboard({ session, stats }: { session: any; stats: Stats }) {
  const total    = stats.assignments.length;
  const complete = stats.assignments.filter((a) => a.progress_status === "complete" || a.progress_status === "done").length;
  const pending  = stats.assignments.filter((a) => a.progress_status === "pending").length;

  const classMap = stats.myClasses.reduce<Record<string, string[]>>((acc, c) => {
    if (!acc[c.class_name]) acc[c.class_name] = [];
    acc[c.class_name].push(c.discipline_name);
    return acc;
  }, {});

  const hasPending = pending > 0;

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
          Meu Painel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bem-vindo, <span className="font-semibold text-foreground">{session.name.split(" ")[0]}</span>
        </p>
      </motion.div>

      {/* ── Banner de pendências ──────────────────────────────────────────── */}
      {hasPending && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/20 rounded-2xl px-5 py-3.5">
            <AlertCircle size={16} className="text-secondary shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-bold">{pending} atribuição{pending > 1 ? "ões" : ""}</span>
              {" "}aguardando envio de questões.
            </p>
            <Link
              href="/dashboard/simulados"
              className="ml-auto shrink-0 text-xs font-bold text-secondary hover:underline flex items-center gap-1"
            >
              Ver <ChevronRight size={12} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
      >
        {[
          {
            label: "Atribuições",
            value: total,
            sub: `${complete} completas`,
            icon: ClipboardList,
            color: "text-primary",
            bg: "bg-primary/8",
            accent: false,
          },
          {
            label: "Completas",
            value: complete,
            sub: complete === total && total > 0 ? "tudo em dia!" : `${total - complete} pendentes`,
            icon: CheckCircle2,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-500/8",
            accent: complete === total && total > 0,
          },
          {
            label: "Questões Enviadas",
            value: stats.myQuestions,
            sub: "contribuições",
            icon: FileText,
            color: "text-secondary",
            bg: "bg-secondary/8",
            accent: false,
          },
        ].map((card) => (
          <motion.div key={card.label} variants={fadeUp}>
            <div className={`bg-card border rounded-2xl p-5 transition-all duration-300 ${
              card.accent
                ? "border-emerald-500/30"
                : "border-border/60"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{card.label}</p>
                  <p className={`text-3xl font-black ${card.accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className={`${card.bg} p-3 rounded-xl`}>
                  <card.icon size={20} className={card.color} />
                </div>
              </div>
              {card.accent && (
                <div className="mt-3 h-0.5 rounded-full bg-emerald-500/20">
                  <div className="h-full w-full rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Minhas atribuições — scroll interno */}
        <motion.div variants={fadeUp} className="xl:col-span-2 bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
            <div>
              <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Minhas Atribuições</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Simulados com questões a enviar</p>
            </div>
            {total > 0 && (
              <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                {total}
              </span>
            )}
          </div>

          {stats.assignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ClipboardList size={22} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma atribuição ainda.</p>
              <p className="text-xs text-muted-foreground/60">O coordenador te atribuirá a um simulado em breve.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[420px] divide-y divide-border/30">
              {stats.assignments.map((a, i) => {
                const examCfg  = examStatusConfig[a.exam_status] ?? { label: a.exam_status, class: "bg-muted text-muted-foreground", border: "border-l-border" };
                const progCfg  = progressConfig[a.progress_status] ?? progressConfig.pending;
                const Icon     = progCfg.icon;
                const pct      = a.quota > 0 ? Math.min(100, Math.round((a.submitted / a.quota) * 100)) : 0;
                const canSubmit = a.exam_status === "collecting";

                return (
                  <div
                    key={i}
                    className={`px-5 py-4 hover:bg-muted/20 transition-colors border-l-[3px] ${examCfg.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-foreground truncate">{a.exam_title}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${examCfg.class}`}>
                            {examCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.discipline_name} · {a.class_name}
                        </p>
                        {a.quota > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[140px]">
                              <div
                                className={`h-full ${progCfg.barColor} rounded-full transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {a.submitted}/{a.quota} questões
                            </span>
                            <Icon size={12} className={progCfg.textColor} />
                          </div>
                        )}
                      </div>
                      {canSubmit && (
                        <Link
                          href={`/dashboard/simulados/${a.exam_id}/questoes`}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Enviar <ChevronRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Minhas turmas — link para /dashboard/turmas */}
        <motion.div variants={fadeUp} className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
            <div>
              <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Minhas Turmas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{Object.keys(classMap).length} turmas atribuídas</p>
            </div>
            <Link
              href="/dashboard/turmas"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>

          {Object.keys(classMap).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users size={22} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma turma atribuída.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 overflow-y-auto max-h-[380px]">
              {Object.entries(classMap).map(([className, disciplines]) => (
                <Link
                  key={className}
                  href="/dashboard/turmas"
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Users size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{className}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {disciplines.map((d) => (
                        <span key={d} className="text-[10px] font-medium bg-primary/8 text-primary px-1.5 py-0.5 rounded-md">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Atalhos ───────────────────────────────────────────────────────── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {[
          { href: "/dashboard/simulados", icon: ClipboardList, label: "Simulados",  sub: "Minhas atribuições",  iconCls: "text-primary",                         bgCls: "bg-primary/10" },
          { href: "/dashboard/turmas",    icon: Users,         label: "Turmas",     sub: "Ver alunos e turmas", iconCls: "text-teal-600 dark:text-teal-400",     bgCls: "bg-teal-500/10" },
        ].map((a) => (
          <motion.div key={a.href} variants={fadeUp}>
            <Link
              href={a.href}
              className="flex items-center gap-4 bg-card border border-border/60 rounded-2xl px-5 py-4 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 group"
            >
              <div className={`${a.bgCls} p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110`}>
                <a.icon size={18} className={a.iconCls} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.sub}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
}
