"use client";

import { useState, useTransition } from "react";
import { Users, BookOpen, Search, GraduationCap, Loader2, ChevronRight, X } from "lucide-react";
import { listarAlunosDaTurma } from "@/lib/exam-actions";

type TeacherClass = { class_id: number; class_name: string; disciplines: string[] };
type Student = { id: number; ra: string; name: string; class_name: string };

export function TeacherTurmasClient({ classes }: { classes: TeacherClass[] }) {
  const [selected, setSelected] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch]     = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSelect(cls: TeacherClass) {
    if (selected?.class_id === cls.class_id) return;
    setSelected(cls);
    setSearch("");
    setStudents([]);
    startTransition(async () => {
      const rows = await listarAlunosDaTurma(cls.class_id);
      setStudents(rows as Student[]);
    });
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ra.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Minhas Turmas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {classes.length} turma{classes.length !== 1 ? "s" : ""} atribuída{classes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Users size={26} className="text-muted-foreground/30" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Nenhuma turma atribuída.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">O coordenador ainda não te atribuiu turmas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

          {/* ── Lista de turmas ─────────────────────────────────────────── */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Turmas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{classes.length} no total</p>
            </div>
            <div className="divide-y divide-border/30">
              {classes.map((cls) => {
                const isActive = selected?.class_id === cls.class_id;
                return (
                  <button
                    key={cls.class_id}
                    onClick={() => handleSelect(cls)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors group ${
                      isActive
                        ? "bg-primary/8 border-l-[3px] border-l-primary"
                        : "hover:bg-muted/20 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    }`}>
                      <Users size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {cls.class_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {cls.disciplines.join(" · ")}
                      </p>
                    </div>
                    <ChevronRight size={13} className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/30 group-hover:text-primary"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Painel de detalhes ──────────────────────────────────────── */}
          <div className="xl:col-span-2 bg-card border border-border/60 rounded-2xl overflow-hidden min-h-[400px] flex flex-col">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <GraduationCap size={26} className="text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Selecione uma turma</p>
                <p className="text-xs text-muted-foreground/60">Clique em uma turma ao lado para ver os alunos e disciplinas.</p>
              </div>
            ) : (
              <>
                {/* Header do painel */}
                <div className="px-6 py-4 border-b border-border/40 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-foreground text-lg">{selected.class_name}</h2>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selected.disciplines.map((d) => (
                        <span key={d} className="text-[11px] font-bold bg-primary/8 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BookOpen size={10} />
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!isPending && (
                    <span className="shrink-0 text-xs font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                      {students.length} aluno{students.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Busca */}
                <div className="px-6 py-3 border-b border-border/30">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou RA..."
                      className="w-full pl-8 pr-8 py-2 text-sm bg-muted/40 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/40"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de alunos */}
                {isPending ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <Loader2 size={22} className="animate-spin text-primary/40" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
                    <GraduationCap size={24} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "Nenhum aluno encontrado." : "Nenhum aluno nesta turma."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 max-h-[480px] divide-y divide-border/20">
                    {filtered.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/10 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-muted-foreground">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">{s.ra}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
