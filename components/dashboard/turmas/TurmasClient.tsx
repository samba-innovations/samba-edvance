"use client";

import Link from "next/link";
import { Users, BookOpen, GraduationCap, ChevronRight } from "lucide-react";

type Turma = {
  id: number;
  name: string;
  grade_label: string;
  level: string;
  year_number: number;
  student_count: bigint;
  discipline_count: bigint;
};

interface Props { turmas: Turma[] }

const levelLabel: Record<string, string> = {
  fundamental: "Fundamental",
  medio: "Médio",
};

export function TurmasClient({ turmas }: Props) {
  // Agrupa por nível
  const byLevel = turmas.reduce<Record<string, Turma[]>>((acc, t) => {
    const key = t.level ?? "outro";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Turmas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {turmas.length} {turmas.length === 1 ? "turma cadastrada" : "turmas cadastradas"}
          </p>
        </div>
      </div>

      {turmas.length === 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
          <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma turma cadastrada.</p>
        </div>
      )}

      {Object.entries(byLevel).map(([level, list]) => (
        <div key={level} className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 px-1">
            Ensino {levelLabel[level] ?? level}
          </p>
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/30">
            {list.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/turmas/${t.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users size={17} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.grade_label} — Ensino {levelLabel[t.level] ?? t.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-foreground">{Number(t.student_count)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <GraduationCap size={11} /> alunos
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-foreground">{Number(t.discipline_count)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <BookOpen size={11} /> disciplinas
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
