"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, GraduationCap, UserCheck, ClipboardList,
  CheckCircle2, XCircle, Users, BookOpen,
} from "lucide-react";

type Turma = {
  id: number; name: string;
  grade_label: string; level: string; year_number: number;
};
type Student = { id: number; ra: string; dig_ra: string | null; name: string; is_active: boolean };
type Teacher = { user_id: number; teacher_name: string; email: string; discipline_name: string };
type Simulado = { id: number; title: string; status: string; area: string | null };

interface Props {
  turma: Turma;
  students: Student[];
  teachers: Teacher[];
  simulados: Simulado[];
}

type Tab = "alunos" | "professores" | "simulados";

const statusCfg: Record<string, { label: string; class: string }> = {
  draft:      { label: "Rascunho",  class: "bg-muted text-muted-foreground" },
  collecting: { label: "Coletando", class: "bg-secondary/10 text-secondary" },
  review:     { label: "Revisão",   class: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label: "Travado",   class: "bg-primary/10 text-primary" },
  generated:  { label: "Gerado",    class: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label: "Publicado", class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

const levelLabel: Record<string, string> = { fundamental: "Fundamental", medio: "Médio" };

export function TurmaDetalheClient({ turma, students, teachers, simulados }: Props) {
  const [tab, setTab] = useState<Tab>("alunos");
  const [search, setSearch] = useState("");

  const filteredStudents = search
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.ra.includes(search)
      )
    : students;

  const activeCount = students.filter(s => s.is_active).length;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/turmas"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50 hover:bg-muted transition-colors shrink-0">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">{turma.name}</h1>
          <p className="text-xs text-muted-foreground">
            {turma.grade_label} — Ensino {levelLabel[turma.level] ?? turma.level}
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Alunos ativos", value: activeCount, icon: GraduationCap, color: "text-primary" },
          { label: "Professores",   value: [...new Set(teachers.map(t => t.user_id))].length, icon: UserCheck, color: "text-secondary" },
          { label: "Simulados",     value: simulados.length, icon: ClipboardList, color: "text-teal-600 dark:text-teal-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
            <Icon size={18} className={color} />
            <div>
              <p className="text-xl font-black text-foreground leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
        {([
          { id: "alunos",     label: "Alunos",     icon: GraduationCap },
          { id: "professores",label: "Professores", icon: UserCheck },
          { id: "simulados",  label: "Simulados",   icon: ClipboardList },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg font-bold text-xs transition-all ${
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Alunos ── */}
      {tab === "alunos" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por nome ou R.A…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredStudents.length} de {students.length}
            </span>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-10 text-center">
                <GraduationCap size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {/* Cabeçalho */}
                <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2.5 bg-muted/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">R.A.</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</p>
                </div>
                {filteredStudents.map(s => (
                  <div key={s.id} className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 items-center">
                    <p className="text-xs font-mono text-muted-foreground w-20">
                      {s.dig_ra ? `${s.ra}-${s.dig_ra}` : s.ra}
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${s.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`}>
                      {s.is_active
                        ? <><CheckCircle2 size={12} /> Ativo</>
                        : <><XCircle size={12} /> Inativo</>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Professores ── */}
      {tab === "professores" && (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          {teachers.length === 0 ? (
            <div className="p-10 text-center">
              <UserCheck size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum professor atribuído.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-2.5 bg-muted/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Professor</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Disciplina</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">E-mail</p>
              </div>
              {teachers.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                      <UserCheck size={13} className="text-secondary" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{t.teacher_name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{t.discipline_name}</p>
                  <p className="text-xs text-muted-foreground/70 hidden md:block">{t.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Simulados ── */}
      {tab === "simulados" && (
        <div className="space-y-2">
          {simulados.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl p-10 text-center">
              <ClipboardList size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum simulado associado a esta turma.</p>
            </div>
          ) : (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/30">
              {simulados.map(sim => {
                const cfg = statusCfg[sim.status] ?? { label: sim.status, class: "bg-muted text-muted-foreground" };
                return (
                  <Link key={sim.id} href={`/dashboard/simulados/${sim.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{sim.title}</p>
                      {sim.area && <p className="text-xs text-muted-foreground">{sim.area}</p>}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.class}`}>
                      {cfg.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
