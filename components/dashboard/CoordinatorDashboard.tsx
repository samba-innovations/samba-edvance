"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList, Library, LayoutTemplate, Plus,
  Users, TrendingUp, CheckCircle2, Clock, AlertCircle,
  ChevronRight, BarChart3, Lock
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  draft:      { label: "Rascunho",    class: "bg-muted text-muted-foreground" },
  collecting: { label: "Coletando",   class: "bg-secondary/10 text-secondary" },
  review:     { label: "Revisão",     class: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label: "Travado",     class: "bg-primary/10 text-primary" },
  generated:  { label: "Gerado",      class: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label: "Publicado",   class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  archived:   { label: "Arquivado",   class: "bg-muted text-muted-foreground/60" },
};

const progressConfig: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  pending:  { label: "Pendente",  icon: Clock,         class: "text-amber-600 dark:text-amber-400" },
  partial:  { label: "Parcial",   icon: AlertCircle,   class: "text-secondary" },
  complete: { label: "Completo",  icon: CheckCircle2,  class: "text-emerald-600 dark:text-emerald-400" },
};

interface Stats {
  totalSimulados: number;
  collecting: number;
  locked: number;
  totalItens: number;
  totalMatrizes: number;
  recentExams: Array<{
    id: number; title: string; status: string; created_at: Date;
    question_count: bigint; total_quota: bigint; total_submitted: bigint;
  }>;
  pendingProgress: Array<{
    exam_id: number; exam_title: string; teacher_name: string;
    discipline_name: string; class_name: string;
    submitted: number; quota: number; status: string;
  }>;
}

export function CoordinatorDashboard({ session, stats }: { session: any; stats: Stats }) {
  const cards = [
    {
      label: "Simulados",
      value: stats.totalSimulados,
      sub: `${stats.collecting} coletando`,
      icon: ClipboardList,
      href: "/dashboard/simulados",
      color: "text-primary",
      bg: "bg-primary/8",
    },
    {
      label: "Em Coleta",
      value: stats.collecting,
      sub: "aguardando questões",
      icon: TrendingUp,
      href: "/dashboard/simulados",
      color: "text-secondary",
      bg: "bg-secondary/8",
    },
    {
      label: "Banco de Itens",
      value: stats.totalItens,
      sub: "itens permanentes",
      icon: Library,
      href: "/dashboard/itens",
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/8",
    },
    {
      label: "Matrizes",
      value: stats.totalMatrizes,
      sub: "configurações",
      icon: LayoutTemplate,
      href: "/dashboard/matrizes",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/8",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Painel do Coordenador
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bem-vindo, <span className="font-semibold text-foreground">{session.name.split(" ")[0]}</span>
          </p>
        </div>
        <Link
          href="/dashboard/simulados/novo"
          className="hidden sm:inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
        >
          <Plus size={16} />
          Novo Simulado
        </Link>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {cards.map((card) => (
          <motion.div key={card.label} variants={fadeUp}>
            <Link
              href={card.href}
              className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{card.label}</p>
                  <p className="text-3xl font-black text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className={`${card.bg} p-3 rounded-xl`}>
                  <card.icon size={20} className={card.color} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        style={{ "--stagger-delay": "0.2s" } as React.CSSProperties}
      >
        {/* Simulados recentes */}
        <motion.div variants={fadeUp} className="xl:col-span-2 bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Simulados</h2>
            <Link href="/dashboard/simulados" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          {stats.recentExams.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum simulado ainda.</p>
              <Link href="/dashboard/simulados/novo" className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
                Criar primeiro →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {stats.recentExams.map((exam) => {
                const cfg = statusConfig[exam.status] ?? { label: exam.status, class: "bg-muted text-muted-foreground" };
                const quota = Number(exam.total_quota);
                const submitted = Number(exam.total_submitted);
                const questions = Number(exam.question_count);
                const pct = quota > 0 ? Math.min(100, Math.round((submitted / quota) * 100)) : null;

                return (
                  <Link
                    key={exam.id}
                    href={`/dashboard/simulados/${exam.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{exam.title}</p>
                      {quota > 0 ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {submitted}/{quota} <span className="hidden sm:inline">questões</span>
                          </span>
                          {pct !== null && (
                            <span className="text-[10px] font-bold text-muted-foreground/60">{pct}%</span>
                          )}
                        </div>
                      ) : questions > 0 ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{questions} questão(ões)</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${cfg.class}`}>
                        {cfg.label}
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Pendências dos professores */}
        <motion.div variants={fadeUp} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Pendências</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Professores com envio incompleto</p>
          </div>

          {stats.pendingProgress.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500/40 mb-2" />
              <p className="text-sm text-muted-foreground">Tudo em dia.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 overflow-y-auto max-h-[360px] custom-scrollbar">
              {stats.pendingProgress.map((p, i) => {
                const cfg = progressConfig[p.status] ?? progressConfig.pending;
                const Icon = cfg.icon;
                return (
                  <Link
                    key={i}
                    href={`/dashboard/simulados/${p.exam_id}`}
                    className="block px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{p.teacher_name.split(" ")[0]}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.discipline_name} · {p.class_name}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{p.exam_title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Icon size={13} className={cfg.class} />
                        <span className="text-[10px] text-muted-foreground">{p.submitted}/{p.quota}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { href: "/dashboard/simulados", icon: ClipboardList, label: "Simulados",   sub: "Gerenciar simulados",    iconCls: "text-primary",                         bgCls: "bg-primary/10" },
          { href: "/dashboard/itens",     icon: Library,       label: "Banco de Itens", sub: "Itens permanentes",   iconCls: "text-teal-600 dark:text-teal-400",     bgCls: "bg-teal-500/10" },
          { href: "/dashboard/disciplinas", icon: Users,       label: "Disciplinas", sub: "Gerenciar matérias",     iconCls: "text-orange-600 dark:text-orange-400", bgCls: "bg-orange-500/10" },
        ].map((a) => (
          <motion.div key={a.href} variants={fadeUp}>
            <Link
              href={a.href}
              className="flex items-center gap-4 bg-card border border-border/60 rounded-2xl px-5 py-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 block"
            >
              <div className={`${a.bgCls} p-2.5 rounded-xl`}>
                <a.icon size={18} className={a.iconCls} />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
