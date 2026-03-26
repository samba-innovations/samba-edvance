"use client";

import Link from "next/link";
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle,
  ChevronRight, BookOpen, Users, FileText
} from "lucide-react";

const examStatusConfig: Record<string, { label: string; class: string }> = {
  draft:      { label: "Rascunho",   class: "bg-muted text-muted-foreground" },
  collecting: { label: "Coletando",  class: "bg-secondary/10 text-secondary" },
  review:     { label: "Revisão",    class: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label: "Travado",    class: "bg-primary/10 text-primary" },
  generated:  { label: "Gerado",     class: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label: "Publicado",  class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  archived:   { label: "Arquivado",  class: "bg-muted text-muted-foreground/60" },
};

const progressConfig: Record<string, { label: string; icon: React.ElementType; barColor: string; textColor: string }> = {
  pending:  { label: "Pendente",  icon: Clock,        barColor: "bg-muted-foreground/30", textColor: "text-muted-foreground" },
  partial:  { label: "Parcial",   icon: AlertCircle,  barColor: "bg-secondary",           textColor: "text-secondary" },
  complete: { label: "Completo",  icon: CheckCircle2, barColor: "bg-emerald-500",         textColor: "text-emerald-600 dark:text-emerald-400" },
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
  const total = stats.assignments.length;
  const complete = stats.assignments.filter((a) => a.progress_status === "complete").length;
  const pending = stats.assignments.filter((a) => a.progress_status === "pending").length;

  // Group classes by name for display
  const classMap = stats.myClasses.reduce<Record<string, string[]>>((acc, c) => {
    if (!acc[c.class_name]) acc[c.class_name] = [];
    acc[c.class_name].push(c.discipline_name);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
          Meu Painel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bem-vindo, <span className="font-semibold text-foreground">{session.name.split(" ")[0]}</span>
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Atribuições",  value: total,            icon: ClipboardList, color: "text-primary",                         bg: "bg-primary/8" },
          { label: "Completas",    value: complete,         icon: CheckCircle2,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/8" },
          { label: "Questões enviadas", value: stats.myQuestions, icon: FileText, color: "text-secondary",                      bg: "bg-secondary/8" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{c.label}</p>
                <p className="text-3xl font-black text-foreground">{c.value}</p>
              </div>
              <div className={`${c.bg} p-3 rounded-xl`}>
                <c.icon size={20} className={c.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Minhas atribuições */}
        <div className="xl:col-span-2 bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Minhas Atribuições</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Simulados com questões a enviar</p>
          </div>

          {stats.assignments.length === 0 ? (
            <div className="py-14 text-center">
              <ClipboardList size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Nenhuma atribuição ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">O coordenador te atribuirá a um simulado em breve.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {stats.assignments.map((a, i) => {
                const examCfg = examStatusConfig[a.exam_status] ?? { label: a.exam_status, class: "bg-muted text-muted-foreground" };
                const progCfg = progressConfig[a.progress_status] ?? progressConfig.pending;
                const Icon = progCfg.icon;
                const pct = a.quota > 0 ? Math.min(100, Math.round((a.submitted / a.quota) * 100)) : 0;
                const canSubmit = a.exam_status === "collecting";

                return (
                  <div key={i} className="px-6 py-4 hover:bg-muted/20 transition-colors">
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
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[160px]">
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
                          Enviar
                          <ChevronRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Minhas turmas */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Minhas Turmas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{Object.keys(classMap).length} turmas atribuídas</p>
          </div>

          {Object.keys(classMap).length === 0 ? (
            <div className="py-10 text-center">
              <Users size={24} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma turma atribuída.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[360px] overflow-y-auto custom-scrollbar">
              {Object.entries(classMap).map(([className, disciplines]) => (
                <div key={className} className="px-5 py-3.5">
                  <p className="text-sm font-bold text-foreground">{className}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {disciplines.map((d) => (
                      <span
                        key={d}
                        className="text-[11px] font-medium bg-primary/8 text-primary px-2 py-0.5 rounded-md"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
