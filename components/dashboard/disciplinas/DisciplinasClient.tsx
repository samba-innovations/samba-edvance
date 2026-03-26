"use client";

import { useActionState, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, BookOpen, Loader2, Tag, Search, ChevronDown, ChevronRight } from "lucide-react";
import { criarDisciplina, excluirDisciplina } from "@/lib/actions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type Disciplina = { id: number; name: string; item_count: bigint };
type Skill      = { id: number; code: string; description: string; area: string | null; level: string | null };
type Area       = { area: string; count: number };

interface Props {
  disciplinas: Disciplina[];
  skills:      Skill[];
  areas:       Area[];
}

function NovaDisciplinaForm() {
  const [state, action, isPending] = useActionState(criarDisciplina, null);
  return (
    <form action={action} className="flex gap-2">
      <input
        name="name"
        required
        placeholder="Nome da disciplina"
        className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
      />
      <button
        type="submit"
        disabled={isPending}
        className="h-9 px-4 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Adicionar
      </button>
      {state?.error && <span className="text-xs text-destructive self-center">{state.error}</span>}
    </form>
  );
}

export function DisciplinasClient({ disciplinas, skills, areas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirmDialog, askConfirm } = useConfirm();

  // BNCC browser state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [skillSearch, setSkillSearch]   = useState("");
  const [expandedArea, setExpandedArea] = useState<Record<string, boolean>>({});

  async function handleDeleteDisciplina(id: number, name: string) {
    if (!await askConfirm(`Excluir disciplina "${name}"? Itens vinculados ficarão sem disciplina.`)) return;
    const res = await excluirDisciplina(id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success!); startTransition(() => router.refresh()); }
  }

  const filteredSkills = useMemo(() => {
    const q = skillSearch.toLowerCase().trim();
    return skills.filter(s => {
      const matchArea = !selectedArea || s.area === selectedArea;
      const matchSearch = !q || s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      return matchArea && matchSearch;
    });
  }, [skills, selectedArea, skillSearch]);

  // Group filtered skills by area
  const grouped = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const s of filteredSkills) {
      const a = s.area ?? "Geral";
      if (!map[a]) map[a] = [];
      map[a].push(s);
    }
    return map;
  }, [filteredSkills]);

  return (
    <>
      {confirmDialog}
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Disciplinas & Habilidades BNCC</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {disciplinas.length} disciplinas cadastradas · {skills.length} habilidades BNCC disponíveis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Coluna Esquerda: Disciplinas ── */}
          <div className="space-y-4">
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
              <h2 className="font-black text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={15} className="text-primary" />
                Nova Disciplina
              </h2>
              <NovaDisciplinaForm />
            </div>

            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40 bg-muted/20">
                <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Disciplinas</h2>
              </div>

              {disciplinas.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {disciplinas.map((disc) => (
                    <div key={disc.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground text-sm">{disc.name}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {Number(disc.item_count)} {Number(disc.item_count) === 1 ? "item" : "itens"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDisciplina(disc.id, disc.name)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Coluna Direita: Habilidades BNCC ── */}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col max-h-[800px]">
            <div className="px-6 py-4 border-b border-border/40 bg-muted/20 space-y-3">
              <h2 className="font-black text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                <Tag size={15} className="text-primary" />
                Habilidades BNCC
                <span className="text-muted-foreground font-normal text-xs normal-case tracking-normal">
                  — disponíveis para os professores
                </span>
              </h2>

              {/* Busca */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  placeholder="Buscar por código ou descrição..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              {/* Filtro por área */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedArea(null)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    !selectedArea ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas
                </button>
                {areas.map(a => (
                  <button
                    key={a.area}
                    onClick={() => setSelectedArea(selectedArea === a.area ? null : a.area)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                      selectedArea === a.area ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.area} <span className="opacity-60">({a.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lista agrupada por área */}
            <div className="overflow-y-auto flex-1 max-h-[600px] divide-y divide-border/30">
              {Object.keys(grouped).length === 0 ? (
                <div className="py-12 text-center">
                  <Tag size={28} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma habilidade encontrada.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([area, areaSkills]) => {
                  const isOpen = expandedArea[area] ?? true;
                  return (
                    <div key={area}>
                      <button
                        onClick={() => setExpandedArea(prev => ({ ...prev, [area]: !isOpen }))}
                        className="w-full flex items-center justify-between px-6 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen
                            ? <ChevronDown size={13} className="text-primary" />
                            : <ChevronRight size={13} className="text-muted-foreground" />
                          }
                          <span className="text-xs font-black text-foreground uppercase tracking-wider">{area}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                            {areaSkills.length}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="divide-y divide-border/10">
                          {areaSkills.map(s => (
                            <div key={s.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/20 transition-colors">
                              <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono shrink-0 mt-0.5">
                                {s.code}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs text-foreground/80 leading-relaxed">{s.description}</p>
                                {s.level && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.level}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 border-t border-border/40 bg-muted/10">
              <p className="text-[10px] text-muted-foreground">
                {filteredSkills.length} de {skills.length} habilidades · professores podem vincular ao enviar questões
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
