"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ClipboardList, X, Loader2, Users, Hash,
  ChevronRight, Check, ChevronLeft, FileText,
  LayoutList, UserCheck, BarChart3, Trash2, LayoutTemplate
} from "lucide-react";
import {
  criarSimuladoCompleto, excluirSimulado,
  getTeachersForClassDiscipline
} from "@/lib/exam-actions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Simulado = {
  id: number; title: string; status: string; created_at: Date;
  class_count: bigint; question_count: bigint; creator_name: string | null;
};
type ClassOpt = { id: number; name: string };
type Disc = { id: number; name: string };
type TeacherOpt = { id: number; name: string; email: string };

const statusConfig: Record<string, { label: string; class: string }> = {
  draft:      { label: "Rascunho",   class: "bg-muted text-muted-foreground" },
  collecting: { label: "Coletando",  class: "bg-secondary/10 text-secondary" },
  review:     { label: "Revisão",    class: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label: "Travado",    class: "bg-primary/10 text-primary" },
  generated:  { label: "Gerado",     class: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label: "Publicado",  class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  archived:   { label: "Arquivado",  class: "bg-muted text-muted-foreground/60" },
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Dados",        icon: FileText },
  { id: 2, label: "Formato",      icon: LayoutList },
  { id: 3, label: "Turmas",       icon: Users },
  { id: 4, label: "Cotas",        icon: BarChart3 },
  { id: 5, label: "Professores",  icon: UserCheck },
  { id: 6, label: "Confirmar",    icon: Check },
];

type QuotaEntry = { disciplineId: number; name: string; quota: number };
type AssignmentEntry = { classId: number; className: string; disciplineId: number; disciplineName: string; teacherId: number; teacherName: string };
type Matriz = { id: number; name: string; config_json: string };

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-between mb-8 px-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
              current > s.id
                ? "bg-primary text-white"
                : current === s.id
                  ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                  : "bg-muted text-muted-foreground"
            }`}>
              {current > s.id ? <Check size={14} /> : <s.icon size={14} />}
            </div>
            <span className={`text-[10px] font-bold text-center leading-tight ${
              current === s.id ? "text-primary" : "text-muted-foreground"
            }`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mb-5 -mx-1 transition-all ${current > s.id ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface WizardProps {
  onClose: () => void;
  allClasses: ClassOpt[];
  disciplinas: Disc[];
  matrizes: Matriz[];
}

function NovoSimuladoWizard({ onClose, allClasses, disciplinas, matrizes }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1-2
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [optionsCount, setOptionsCount] = useState<"4" | "5">("5");

  // Step 3
  const [selectedClasses, setSelectedClasses] = useState<ClassOpt[]>([]);

  // Step 4 — quotas
  const [quotas, setQuotas] = useState<QuotaEntry[]>([]);
  const [newDiscId, setNewDiscId] = useState("");
  const [newDiscQty, setNewDiscQty] = useState("5");

  // Step 5 — assignments
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [teacherCache, setTeacherCache] = useState<Record<string, TeacherOpt[]>>({});
  const [loadingTeacher, setLoadingTeacher] = useState<string | null>(null);

  // Pre-fetch teachers for all class × discipline combinations when entering step 5
  useEffect(() => {
    if (step !== 5) return;
    const pairs = selectedClasses.flatMap((c) => quotas.map((q) => ({ classId: c.id, disciplineId: q.disciplineId })));
    pairs.forEach(({ classId, disciplineId }) => {
      const key = `${classId}-${disciplineId}`;
      if (teacherCache[key] !== undefined) return;
      setLoadingTeacher(key);
      getTeachersForClassDiscipline(classId, disciplineId).then((rows) => {
        setTeacherCache((prev) => ({ ...prev, [key]: rows as TeacherOpt[] }));
        setLoadingTeacher(null);
      });
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleClass(c: ClassOpt) {
    setSelectedClasses((prev) =>
      prev.some((x) => x.id === c.id) ? prev.filter((x) => x.id !== c.id) : [...prev, c]
    );
  }

  function addQuota() {
    if (!newDiscId) return;
    const disc = disciplinas.find((d) => d.id === Number(newDiscId));
    if (!disc) return;
    setQuotas((prev) => [...prev.filter((q) => q.disciplineId !== disc.id), { disciplineId: disc.id, name: disc.name, quota: Number(newDiscQty) || 0 }]);
    setNewDiscId("");
    setNewDiscQty("5");
  }

  function removeQuota(disciplineId: number) {
    setQuotas((prev) => prev.filter((q) => q.disciplineId !== disciplineId));
    setAssignments((prev) => prev.filter((a) => a.disciplineId !== disciplineId));
  }

  function setAssignment(classId: number, className: string, disciplineId: number, disciplineName: string, teacherId: number, teacherName: string) {
    setAssignments((prev) => {
      const filtered = prev.filter((a) => !(a.classId === classId && a.disciplineId === disciplineId));
      if (teacherId === 0) return filtered;
      return [...filtered, { classId, className, disciplineId, disciplineName, teacherId, teacherName }];
    });
  }

  function validate(): boolean {
    if (step === 1 && !title.trim()) { setError("O título é obrigatório."); return false; }
    setError("");
    return true;
  }

  function next() {
    if (!validate()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await criarSimuladoCompleto({
      title: title.trim(),
      area: area.trim() || null,
      optionsCount: Number(optionsCount),
      classIds: selectedClasses.map((c) => c.id),
      quotas: quotas.map((q) => ({ disciplineId: q.disciplineId, quota: q.quota })),
      assignments: assignments.map((a) => ({ classId: a.classId, disciplineId: a.disciplineId, teacherId: a.teacherId })),
    });
    setSubmitting(false);
    if (res.error) { toast.error(res.error); setError(res.error); return; }
    toast.success(res.success);
    router.refresh();
    if (res.examId) router.push(`/dashboard/simulados/${res.examId}`);
    onClose();
  }

  const unusedDiscs = disciplinas.filter((d) => !quotas.some((q) => q.disciplineId === d.id));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-0 shrink-0">
          <h2 className="font-black text-xl text-foreground">Novo Simulado</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 pt-6 pb-0 shrink-0">
          <StepIndicator current={step} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">

          {/* ── Passo 1: Dados básicos ── */}
          {step === 1 && (
            <div className="space-y-4 pb-2">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Título <span className="text-destructive">*</span>
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="Ex: Simulado ENEM — 3º EM"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  Área <span className="text-muted-foreground/50 font-normal normal-case">(opcional)</span>
                </label>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="Ex: Ciências da Natureza"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
            </div>
          )}

          {/* ── Passo 2: Formato ── */}
          {step === 2 && (
            <div className="space-y-3 pb-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Alternativas por questão</p>
              {(["5", "4"] as const).map((n) => {
                const labels = n === "4" ? "A, B, C, D" : "A, B, C, D, E";
                const selected = optionsCount === n;
                return (
                  <button key={n} type="button" onClick={() => setOptionsCount(n)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>{n}</div>
                    <div>
                      <p className={`font-black text-sm ${selected ? "text-primary" : "text-foreground"}`}>{n} alternativas</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{labels}</p>
                    </div>
                    {selected && <Check size={16} className="text-primary ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Passo 3: Turmas ── */}
          {step === 3 && (
            <div className="space-y-3 pb-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Selecione as turmas participantes</p>
              {allClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma turma cadastrada.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {allClasses.map((c) => {
                    const selected = selectedClasses.some((x) => x.id === c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleClass(c)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          selected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-border/80 hover:bg-muted/30 text-foreground"
                        }`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {selected && <Check size={11} className="text-white" />}
                        </div>
                        <span className="text-sm font-bold truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedClasses.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1">{selectedClasses.length} turma(s) selecionada(s)</p>
              )}
            </div>
          )}

          {/* ── Passo 4: Cotas ── */}
          {step === 4 && (
            <div className="space-y-4 pb-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Disciplinas e quantidade de questões</p>

              {/* Carregar de matriz */}
              {matrizes.length > 0 && (
                <div className="flex gap-2 items-center p-3 bg-muted/30 rounded-xl border border-border/50">
                  <LayoutTemplate size={14} className="text-muted-foreground shrink-0" />
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const m = matrizes.find((x) => x.id === Number(e.target.value));
                      if (!m) return;
                      const config: Record<string, number> = JSON.parse(m.config_json || "{}");
                      const newQuotas: QuotaEntry[] = [];
                      for (const [discIdStr, qty] of Object.entries(config)) {
                        const disc = disciplinas.find((d) => d.id === Number(discIdStr));
                        if (disc && qty > 0) newQuotas.push({ disciplineId: disc.id, name: disc.name, quota: qty });
                      }
                      if (newQuotas.length > 0) {
                        setQuotas(newQuotas);
                        setAssignments([]);
                      }
                      e.target.value = "";
                    }}
                    className="flex-1 h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 appearance-none"
                  >
                    <option value="">Carregar de uma matriz...</option>
                    {matrizes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Add discipline */}
              <div className="flex gap-2">
                <select value={newDiscId} onChange={(e) => setNewDiscId(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 appearance-none">
                  <option value="">Adicionar disciplina...</option>
                  {unusedDiscs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="number" min={1} value={newDiscQty} onChange={(e) => setNewDiscQty(e.target.value)}
                  placeholder="Qtd."
                  className="w-20 h-10 px-3 rounded-xl bg-background border border-border text-sm text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={addQuota} disabled={!newDiscId}
                  className="h-10 px-4 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              {/* Quota list */}
              {quotas.length === 0 ? (
                <div className="bg-muted/30 rounded-2xl py-8 text-center">
                  <BarChart3 size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma disciplina adicionada.</p>
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  {quotas.map((q, i) => (
                    <div key={q.disciplineId} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border/40" : ""}`}>
                      <span className="flex-1 text-sm font-medium text-foreground">{q.name}</span>
                      <input type="number" min={1} value={q.quota}
                        onChange={(e) => setQuotas((prev) => prev.map((x) => x.disciplineId === q.disciplineId ? { ...x, quota: Number(e.target.value) } : x))}
                        className="w-20 h-9 px-3 rounded-xl bg-background border border-border text-sm text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                      <span className="text-xs text-muted-foreground">questões</span>
                      <button type="button" onClick={() => removeQuota(q.disciplineId)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/40">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Total</span>
                    <span className="text-sm font-black text-foreground">{quotas.reduce((s, q) => s + q.quota, 0)} questões</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Passo 5: Professores ── */}
          {step === 5 && (
            <div className="space-y-3 pb-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Atribuir professores por turma e disciplina</p>
              {selectedClasses.length === 0 || quotas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma turma ou disciplina definida nos passos anteriores.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedClasses.map((c) => (
                    <div key={c.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
                        <p className="text-xs font-black text-foreground uppercase tracking-wide">{c.name}</p>
                      </div>
                      {quotas.map((q) => {
                        const key = `${c.id}-${q.disciplineId}`;
                        const teachers = teacherCache[key] ?? [];
                        const loading = loadingTeacher === key;
                        const current = assignments.find((a) => a.classId === c.id && a.disciplineId === q.disciplineId);
                        return (
                          <div key={q.disciplineId} className="flex items-center gap-3 px-4 py-3 border-t border-border/30 first:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{q.name}</p>
                              <p className="text-[11px] text-muted-foreground">{q.quota} questões</p>
                            </div>
                            <select
                              value={current?.teacherId ?? ""}
                              onChange={(e) => {
                                const t = teachers.find((t) => t.id === Number(e.target.value));
                                setAssignment(c.id, c.name, q.disciplineId, q.name, Number(e.target.value), t?.name ?? "");
                              }}
                              disabled={loading || teachers.length === 0}
                              className="h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 appearance-none disabled:opacity-50 min-w-[180px]"
                            >
                              <option value="">
                                {loading ? "Carregando..." : teachers.length === 0 ? "Sem professor cadastrado" : "Selecionar professor..."}
                              </option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Passo 6: Confirmação ── */}
          {step === 6 && (
            <div className="space-y-4 pb-2">
              <div className="bg-muted/30 rounded-2xl divide-y divide-border/40">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Título</span>
                  <span className="text-sm font-bold text-foreground text-right max-w-[60%] truncate">{title}</span>
                </div>
                {area && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground font-medium">Área</span>
                    <span className="text-sm font-bold text-foreground">{area}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Alternativas</span>
                  <span className="text-sm font-bold text-foreground">{optionsCount === "4" ? "A, B, C, D" : "A, B, C, D, E"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Turmas</span>
                  <span className="text-sm font-bold text-foreground">{selectedClasses.length > 0 ? selectedClasses.map((c) => c.name).join(", ") : "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Disciplinas</span>
                  <span className="text-sm font-bold text-foreground text-right">
                    {quotas.length > 0 ? quotas.map((q) => `${q.name} (${q.quota})`).join(", ") : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Professores</span>
                  <span className="text-sm font-bold text-foreground">{assignments.length} atribuídos</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Status inicial</span>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">Coletando</span>
                </div>
              </div>
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>
          )}

        </div>

        {/* Footer navigation */}
        <div className="flex gap-3 px-8 py-6 border-t border-border/40 shrink-0">
          {step > 1 ? (
            <button type="button" onClick={() => { setError(""); setStep((s) => s - 1); }} disabled={submitting}
              className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-border font-bold text-sm hover:bg-muted/50 transition-all">
              <ChevronLeft size={15} /> Voltar
            </button>
          ) : (
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border font-bold text-sm hover:bg-muted/50 transition-all">
              Cancelar
            </button>
          )}

          {error && step !== 6 && <p className="flex-1 text-xs text-destructive font-medium self-center">{error}</p>}

          {step < 6 ? (
            <button type="button" onClick={next}
              className="flex-1 h-11 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.99]">
              Próximo <ChevronRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex-1 h-11 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar Simulado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SimuladosClient({
  simulados, isCoordinator, allClasses, disciplinas, matrizes,
}: {
  simulados: Simulado[];
  isCoordinator: boolean;
  allClasses: ClassOpt[];
  disciplinas: Disc[];
  matrizes: Matriz[];
}) {
  const router = useRouter();
  const { confirmDialog, askConfirm } = useConfirm();
  const [showWizard, setShowWizard] = useState(false);
  const [, startTransition] = useTransition();

  async function handleDelete(id: number, title: string) {
    if (!await askConfirm(`Excluir "${title}"?`)) return;
    const res = await excluirSimulado(id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  return (
    <>
      {confirmDialog}
      {showWizard && (
        <NovoSimuladoWizard
          onClose={() => setShowWizard(false)}
          allClasses={allClasses}
          disciplinas={disciplinas}
          matrizes={matrizes}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Simulados</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {simulados.length} {simulados.length === 1 ? "simulado" : "simulados"}
            </p>
          </div>
          {isCoordinator && (
            <button onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95">
              <Plus size={16} /> Novo Simulado
            </button>
          )}
        </div>

        {simulados.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl py-16 text-center">
            <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum simulado ainda.</p>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider">Título</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden md:table-cell">Turmas</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden md:table-cell">Questões</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                    <th className="px-4 py-3.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {simulados.map((s) => {
                    const cfg = statusConfig[s.status] ?? { label: s.status, class: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-bold text-foreground text-[13px]">{s.title}</p>
                          {s.creator_name && <p className="text-[11px] text-muted-foreground mt-0.5">{s.creator_name}</p>}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${cfg.class}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <Users size={13} /> {Number(s.class_count)}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <Hash size={13} /> {Number(s.question_count)}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell text-[13px] text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/simulados/${s.id}`}
                              className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors">
                              Abrir <ChevronRight size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
