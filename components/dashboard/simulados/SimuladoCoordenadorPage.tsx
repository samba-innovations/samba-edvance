"use client";

import { useState, useTransition, useEffect, useCallback, type ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Lock, Unlock, Users, BookOpen, UserCheck,
  FileText, CheckCircle2, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronRight, Trash2, Plus, Save, BarChart3, Download, Loader2
} from "lucide-react";
import {
  atualizarStatusSimulado, atribuirTurma, removerTurma,
  salvarCota, atribuirProfessor, removerAtribuicaoProfessor,
  atualizarEstadoQuestao, atualizarGabaritoQuestao, excluirSimulado,
  getTeachersForClassDiscipline, aprovarTodasQuestoes, listarAlunosDaTurma,
  limparTodasQuestoes, destravarSimulado,
} from "@/lib/exam-actions";
import { toast } from "sonner";
import { RichText } from "@/components/RichText";
import { useConfirm } from "@/components/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Simulado  = { id:number; title:string; area:string|null; status:string; options_count:number };
type ClassRow  = { id:number; class_id:number; class_name:string };
type Quota     = { id:number; discipline_id:number; discipline_name:string; quota:number };
type Assignment= { id:number; class_id:number; class_name:string; discipline_id:number; discipline_name:string; teacher_id:number; teacher_name:string; submitted:number; quota:number; progress_status:string };
type Question  = { id:number; stem:string; state:string; source:string; correct_label:string|null; created_at:Date; teacher_name:string; discipline_name:string; class_name:string; options:string; images:string };
type ClassOpt  = { id:number; name:string };
type Teacher   = { id:number; name:string; email:string };
type Disc      = { id:number; name:string };

interface Props {
  simulado: Simulado; classes: ClassRow[]; quotas: Quota[];
  assignments: Assignment[]; questions: Question[];
  allClasses: ClassOpt[]; allTeachers: Teacher[]; disciplinas: Disc[];
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusCfg: Record<string, { label:string; class:string }> = {
  draft:      { label:"Rascunho",  class:"bg-muted text-muted-foreground" },
  collecting: { label:"Coletando", class:"bg-secondary/10 text-secondary" },
  review:     { label:"Revisão",   class:"bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label:"Travado",   class:"bg-primary/10 text-primary" },
  generated:  { label:"Gerado",    class:"bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label:"Publicado", class:"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  archived:   { label:"Arquivado", class:"bg-muted text-muted-foreground/60" },
};

const progressCfg: Record<string, { icon:ElementType; class:string }> = {
  pending:  { icon:Clock,        class:"text-muted-foreground" },
  partial:  { icon:AlertCircle,  class:"text-secondary" },
  complete: { icon:CheckCircle2, class:"text-emerald-600 dark:text-emerald-400" },
};

const questionStateCfg: Record<string, { label:string; class:string }> = {
  submitted: { label:"Enviada",  class:"bg-secondary/10 text-secondary" },
  approved:  { label:"Aprovada", class:"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  rejected:  { label:"Rejeitada",class:"bg-red-500/10 text-red-600 dark:text-red-400" },
};

// ─── Tab buttons ──────────────────────────────────────────────────────────────

type Tab = "turmas" | "cotas" | "professores" | "questoes" | "cadernos";

const TABS: { id:Tab; label:string; icon:ElementType }[] = [
  { id:"turmas",     label:"Turmas",     icon:Users },
  { id:"cotas",      label:"Cotas",      icon:BarChart3 },
  { id:"professores",label:"Professores",icon:UserCheck },
  { id:"questoes",   label:"Questões",   icon:FileText },
  { id:"cadernos",   label:"Cadernos",   icon:Download },
];

// ─── Step Guide ──────────────────────────────────────────────────────────────

const STEPS: {
  key: string;
  label: string;
  desc: string;
  action: string;
  icon: ElementType;
  tabs: Tab[];
}[] = [
  { key: "collecting", label: "Configurar",  desc: "Turmas, cotas e professores",   action: "Configure as turmas, cotas e atribua professores",  icon: Users,        tabs: ["turmas","cotas","professores"] },
  { key: "review",     label: "Coletar",     desc: "Professores enviam questões",    action: "Acompanhe o envio das questões pelos professores",   icon: BookOpen,     tabs: ["questoes"] },
  { key: "locked",     label: "Revisar",     desc: "Aprovar e definir gabaritos",    action: "Revise, aprove questões e defina os gabaritos",      icon: UserCheck,    tabs: ["questoes"] },
  { key: "generated",  label: "Gerar PDFs",  desc: "Cadernos e folhas de resposta",  action: "Baixe e confira os cadernos gerados",               icon: FileText,     tabs: ["cadernos"] },
  { key: "published",  label: "Publicar",    desc: "Disponível para aplicação",      action: "Simulado publicado e disponível",                    icon: CheckCircle2, tabs: ["cadernos"] },
];

const STATUS_TO_STEP: Record<string, number> = {
  draft: 0, collecting: 0, review: 1, locked: 2, generated: 3, published: 4, archived: 4,
};

function StepGuide({ status, onTabChange }: { status: string; onTabChange: (tab: Tab) => void }) {
  const current = STATUS_TO_STEP[status] ?? 0;
  const activeStep = STEPS[current];
  const isDone = status === "published" || status === "archived";
  // Percentagem de preenchimento da track: de 10% (centro col-0) a 90% (centro col-4)
  // Cada passo avança 20% (80% / 4 gaps)
  const fillPct = current > 0 ? (current / (STEPS.length - 1)) * 80 : 0;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      {/* ── Linha de passos (grid para espaçamento 100% simétrico) ──────────── */}
      <div className="relative pt-5 pb-4">
        {/* Track background: left-[10%] a right-[10%] = centros das colunas 0 e 4 */}
        <div
          className="absolute top-[42px] left-[10%] right-[10%] h-0.5 rounded-full bg-border/40 pointer-events-none"
        />
        {/* Progress fill — transição suave ao avançar */}
        <div
          className="absolute top-[42px] left-[10%] h-0.5 rounded-full bg-emerald-400 pointer-events-none transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%` }}
        />

        {/* Nós — grid garante espaçamento exato entre todos os passos */}
        <div className="grid grid-cols-5">
          {STEPS.map((step, i) => {
            const done   = i < current;
            const active = i === current;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2">
                {/* Círculo */}
                <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : active
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/25 ring-4 ring-primary/15"
                    : "bg-background border-border/50 text-muted-foreground/40"
                }`}>
                  {done
                    ? <CheckCircle2 size={18} />
                    : <StepIcon size={17} className={active ? "text-white" : undefined} />
                  }
                  {active && !isDone && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>

                {/* Texto */}
                <div className="text-center px-2">
                  <p className={`text-[11px] font-bold leading-tight ${
                    active ? "text-foreground"
                    : done  ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/40"
                  }`}>
                    {step.label}
                  </p>
                  {/* Desc visível só no passo ativo; ocupa espaço nos demais para manter alinhamento */}
                  <p className={`text-[9.5px] leading-snug mt-0.5 ${
                    active ? "text-muted-foreground" : "text-transparent select-none"
                  }`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Barra de próximo passo ───────────────────────────────────────────── */}
      {!isDone && activeStep && (
        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border/40 bg-primary/[0.04]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <p className="text-[13px] truncate">
              <span className="text-muted-foreground">Próximo: </span>
              <span className="font-semibold text-foreground">{activeStep.action}</span>
            </p>
          </div>
          {activeStep.tabs.length > 0 && (
            <button
              onClick={() => onTabChange(activeStep.tabs[0])}
              className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 px-3.5 py-2 rounded-xl transition-all shrink-0"
            >
              {TABS.find(t => t.id === activeStep.tabs[0])?.label}
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Publicado ────────────────────────────────────────────────────────── */}
      {isDone && (
        <div className="flex items-center gap-2.5 px-6 py-3 border-t border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Simulado publicado e disponível para aplicação.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SimuladoCoordenaorPage({ simulado, classes, quotas, assignments, questions, allClasses, allTeachers, disciplinas }: Props) {
  const router = useRouter();
  const { confirmDialog, askConfirm } = useConfirm();
  const [tab, setTab] = useState<Tab>("turmas");
  const [isPending, startTransition] = useTransition();
  const cfg = statusCfg[simulado.status] ?? { label: simulado.status, class:"bg-muted text-muted-foreground" };
  const isLocked = ["locked","generated","published","archived"].includes(simulado.status);
  const todasAprovadas = questions.length > 0 && questions.every(q => q.state === "approved");

  // Alunos por turma (carregados ao expandir)
  type StudentRow = { id: number; ra: string; name: string; class_name: string };
  const [alunosPorTurma, setAlunosPorTurma] = useState<Record<number, StudentRow[]>>({});
  const [turmasExpandidas, setTurmasExpandidas] = useState<Record<number, boolean>>({});
  const [loadingAlunos, setLoadingAlunos] = useState<Record<number, boolean>>({});

  const toggleTurma = useCallback(async (classId: number) => {
    if (turmasExpandidas[classId]) {
      setTurmasExpandidas(p => ({ ...p, [classId]: false }));
      return;
    }
    if (!alunosPorTurma[classId]) {
      setLoadingAlunos(p => ({ ...p, [classId]: true }));
      const rows = await listarAlunosDaTurma(classId);
      setAlunosPorTurma(p => ({ ...p, [classId]: rows as StudentRow[] }));
      setLoadingAlunos(p => ({ ...p, [classId]: false }));
    }
    setTurmasExpandidas(p => ({ ...p, [classId]: true }));
  }, [turmasExpandidas, alunosPorTurma]);

  // ── Status actions ──────────────────────────────────────────────────────────
  async function handleStatus(status: string) {
    const res = await atualizarStatusSimulado(simulado.id, status);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  async function handleDestravar() {
    if (!await askConfirm("Destravar o simulado? Os PDFs gerados serão removidos e as questões aprovadas voltarão ao estado 'enviada' para re-revisão.")) return;
    const res = await destravarSimulado(simulado.id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  // ── Turmas ──────────────────────────────────────────────────────────────────
  const [newClassId, setNewClassId] = useState("");
  async function handleAddClass() {
    if (!newClassId) return;
    const res = await atribuirTurma(simulado.id, Number(newClassId));
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); setNewClassId(""); startTransition(() => router.refresh()); }
  }

  // ── Cotas ───────────────────────────────────────────────────────────────────
  const [quotaMap, setQuotaMap] = useState<Record<number,number>>(
    Object.fromEntries(quotas.map(q => [q.discipline_id, q.quota]))
  );
  const [newQuotaDisc, setNewQuotaDisc] = useState("");
  const [newQuotaVal, setNewQuotaVal] = useState("");

  async function handleSaveQuota(disciplineId: number) {
    const res = await salvarCota(simulado.id, disciplineId, quotaMap[disciplineId] ?? 0);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  async function handleAddQuota() {
    if (!newQuotaDisc) return;
    const res = await salvarCota(simulado.id, Number(newQuotaDisc), Number(newQuotaVal) || 0);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); setNewQuotaDisc(""); setNewQuotaVal(""); startTransition(() => router.refresh()); }
  }

  // ── Professores ─────────────────────────────────────────────────────────────
  const [selClass, setSelClass] = useState("");
  const [selDisc, setSelDisc]  = useState("");
  const [selTeacher, setSelTeacher] = useState("");
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => {
    setSelTeacher("");
    if (!selClass || !selDisc) { setFilteredTeachers([]); return; }
    setLoadingTeachers(true);
    getTeachersForClassDiscipline(Number(selClass), Number(selDisc))
      .then((rows) => setFilteredTeachers(rows as Teacher[]))
      .finally(() => setLoadingTeachers(false));
  }, [selClass, selDisc]);

  async function handleAssignTeacher() {
    if (!selClass || !selDisc || !selTeacher) return;
    const res = await atribuirProfessor(simulado.id, Number(selClass), Number(selDisc), Number(selTeacher));
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); setSelClass(""); setSelDisc(""); setSelTeacher(""); startTransition(() => router.refresh()); }
  }

  // ── Questões ────────────────────────────────────────────────────────────────
  const [expandedQ, setExpandedQ] = useState<Record<number,boolean>>({});
  const [blankClassId, setBlankClassId] = useState<string>("");
  async function handleAprovarTodas() {
    const n = questions.filter(q => q.state !== "approved").length;
    if (!await askConfirm(`Aprovar todas as ${n} questões pendentes?`, { confirmLabel: "Aprovar", danger: false })) return;
    const res = await aprovarTodasQuestoes(simulado.id);
    if (res.error) toast.error(res.error);
    else { toast.success(`${res.count} questão(ões) aprovada(s).`); startTransition(() => router.refresh()); }
  }
  async function handleApagarTodas() {
    if (!await askConfirm(`Apagar todas as ${questions.length} questões deste simulado? Esta ação não pode ser desfeita.`)) return;
    const res = await limparTodasQuestoes(simulado.id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }
  async function handleApprove(qId: number) {
    const res = await atualizarEstadoQuestao(qId, simulado.id, "approved");
    if (res.error) toast.error(res.error); else toast.success(res.success);
    startTransition(() => router.refresh());
  }
  async function handleReject(qId: number) {
    const res = await atualizarEstadoQuestao(qId, simulado.id, "rejected");
    if (res.error) toast.error(res.error); else toast.success(res.success);
    startTransition(() => router.refresh());
  }
  async function handleGabarito(qId: number, label: string) {
    const res = await atualizarGabaritoQuestao(qId, simulado.id, label);
    if (res.error) toast.error(res.error); else toast.success(res.success);
    startTransition(() => router.refresh());
  }

  const inputCls = "h-9 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all";
  const selectCls = inputCls + " appearance-none";
  const btnPrimary = "h-9 px-4 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-60";

  return (
    <div className="space-y-6 w-full">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/simulados" className="mt-1 p-2 rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground tracking-tight truncate">{simulado.title}</h1>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${cfg.class}`}>{cfg.label}</span>
          </div>
          {simulado.area && <p className="text-sm text-muted-foreground mt-0.5">{simulado.area}</p>}
        </div>
        {/* Status actions */}
        <div className="flex items-center gap-2 shrink-0">
          {(simulado.status === "collecting" || simulado.status === "review") && (
            <button onClick={() => handleStatus("locked")} disabled={isPending}
              className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60">
              <Lock size={13} /> Travar
            </button>
          )}
          {simulado.status === "locked" && (
            <>
              <button
                onClick={handleDestravar}
                disabled={isPending || !todasAprovadas}
                title={!todasAprovadas ? "Aprove todas as questões antes de destravar" : undefined}
                className="flex items-center gap-2 h-9 px-4 border border-border text-foreground rounded-xl font-bold text-xs hover:bg-muted/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <Unlock size={13} /> Destravar
              </button>
              <button onClick={async () => { await handleStatus("generated"); setTab("cadernos"); }} disabled={isPending || !todasAprovadas}
                className="flex items-center gap-2 h-9 px-4 bg-teal-600 text-white rounded-xl font-bold text-xs hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Gerar PDF
              </button>
            </>
          )}
          {simulado.status === "generated" && (
            <>
              <button
                onClick={handleDestravar}
                disabled={isPending || !todasAprovadas}
                title={!todasAprovadas ? "Aprove todas as questões antes de destravar" : undefined}
                className="flex items-center gap-2 h-9 px-4 border border-border text-foreground rounded-xl font-bold text-xs hover:bg-muted/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <Unlock size={13} /> Destravar
              </button>
              <button onClick={() => setTab("cadernos")}
                className="flex items-center gap-2 h-9 px-4 border border-teal-500 text-teal-600 dark:text-teal-400 rounded-xl font-bold text-xs hover:bg-teal-500/10 transition-all">
                <Download size={13} /> Baixar Cadernos
              </button>
              <button onClick={() => handleStatus("published")} disabled={isPending}
                className="flex items-center gap-2 h-9 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all active:scale-95">
                <CheckCircle2 size={13} /> Publicar
              </button>
            </>
          )}
          {simulado.status === "published" && (
            <>
              <button
                onClick={handleDestravar}
                disabled={isPending || !todasAprovadas}
                title={!todasAprovadas ? "Aprove todas as questões antes de destravar" : undefined}
                className="flex items-center gap-2 h-9 px-4 border border-border text-foreground rounded-xl font-bold text-xs hover:bg-muted/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                <Unlock size={13} /> Destravar
              </button>
              <button onClick={() => setTab("cadernos")}
                className="flex items-center gap-2 h-9 px-4 border border-teal-500 text-teal-600 dark:text-teal-400 rounded-xl font-bold text-xs hover:bg-teal-500/10 transition-all">
                <Download size={13} /> Baixar Cadernos
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Step Guide ─────────────────────────────────────────────────────── */}
      <StepGuide status={simulado.status} onTabChange={setTab} />

      {/* Tabs */}
      {(() => {
        const nextTabs = STEPS[STATUS_TO_STEP[simulado.status] ?? 0]?.tabs ?? [];
        return (
          <div className="flex gap-1 bg-muted/40 p-1 rounded-2xl w-fit">
            {TABS.map((t) => {
              const isNext = nextTabs.includes(t.id) && tab !== t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    tab === t.id ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <t.icon size={14} /> {t.label}
                  {t.id === "questoes" && questions.length > 0 && (
                    <span className="bg-primary/15 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full">{questions.length}</span>
                  )}
                  {/* Dot: aba recomendada para o passo atual */}
                  {isNext && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── ABA: TURMAS ────────────────────────────────────────────────────── */}
      {tab === "turmas" && (
        <div className="space-y-4">
          {!isLocked && (
            <div className="flex gap-2">
              <select value={newClassId} onChange={e => setNewClassId(e.target.value)} className={selectCls + " flex-1 max-w-xs"}>
                <option value="">Selecionar turma...</option>
                {allClasses.filter(c => !classes.some(ec => ec.class_id === c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={handleAddClass} disabled={!newClassId || isPending} className={btnPrimary}>
                <Plus size={13} /> Adicionar
              </button>
            </div>
          )}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {classes.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma turma atribuída.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {classes.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3.5 group hover:bg-muted/20 transition-colors">
                    <span className="font-medium text-sm text-foreground">{c.class_name}</span>
                    {!isLocked && (
                      <button onClick={() => removerTurma(simulado.id, c.class_id).then(r => { if(r.error) toast.error(r.error); else { toast.success(r.success); startTransition(() => router.refresh()); }})}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: COTAS ──────────────────────────────────────────────────────── */}
      {tab === "cotas" && (
        <div className="space-y-4">
          {!isLocked && (
            <div className="flex gap-2 items-center">
              <select value={newQuotaDisc} onChange={e => setNewQuotaDisc(e.target.value)} className={selectCls + " flex-1 max-w-xs"}>
                <option value="">Adicionar disciplina...</option>
                {disciplinas.filter(d => !quotas.some(q => q.discipline_id === d.id)).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input type="number" min={0} value={newQuotaVal} onChange={e => setNewQuotaVal(e.target.value)}
                placeholder="Qtd." className={inputCls + " w-20 text-center"} />
              <button onClick={handleAddQuota} disabled={!newQuotaDisc || isPending} className={btnPrimary}>
                <Plus size={13} /> Adicionar
              </button>
            </div>
          )}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {quotas.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma cota definida.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {quotas.map(q => (
                  <div key={q.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex-1 font-medium text-sm text-foreground">{q.discipline_name}</span>
                    <input type="number" min={0} disabled={isLocked}
                      value={quotaMap[q.discipline_id] ?? q.quota}
                      onChange={e => setQuotaMap(prev => ({ ...prev, [q.discipline_id]: Number(e.target.value) }))}
                      className={inputCls + " w-20 text-center disabled:opacity-60 disabled:cursor-not-allowed"} />
                    {!isLocked && (
                      <button onClick={() => handleSaveQuota(q.discipline_id)} disabled={isPending} className={btnPrimary}>
                        <Save size={12} /> Salvar
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3.5 bg-muted/20">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Total</span>
                  <span className="font-black text-foreground text-sm">
                    {quotas.reduce((a, q) => a + (quotaMap[q.discipline_id] ?? q.quota), 0)} questões
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: PROFESSORES ────────────────────────────────────────────────── */}
      {tab === "professores" && (
        <div className="space-y-4">
          {!isLocked && (
            <div className="flex flex-wrap gap-2 items-center">
              <select value={selClass} onChange={e => setSelClass(e.target.value)} className={selectCls + " min-w-[140px]"}>
                <option value="">Turma...</option>
                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
              </select>
              <select value={selDisc} onChange={e => setSelDisc(e.target.value)} className={selectCls + " min-w-[160px]"}>
                <option value="">Disciplina...</option>
                {quotas.map(q => <option key={q.discipline_id} value={q.discipline_id}>{q.discipline_name}</option>)}
              </select>
              <select
                value={selTeacher}
                onChange={e => setSelTeacher(e.target.value)}
                disabled={!selClass || !selDisc || loadingTeachers}
                className={selectCls + " min-w-[180px] disabled:opacity-60"}
              >
                <option value="">
                  {loadingTeachers ? "Carregando..." : (!selClass || !selDisc) ? "Selecione turma e disciplina..." : filteredTeachers.length === 0 ? "Nenhum professor encontrado" : "Professor..."}
                </option>
                {filteredTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={handleAssignTeacher} disabled={!selClass || !selDisc || !selTeacher || isPending} className={btnPrimary}>
                <Plus size={13} /> Atribuir
              </button>
            </div>
          )}
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {assignments.length === 0 ? (
              <div className="py-10 text-center">
                <UserCheck size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum professor atribuído.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    {["Turma","Disciplina","Professor","Progresso"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {assignments.map(a => {
                    const pCfg = progressCfg[a.progress_status] ?? progressCfg.pending;
                    const Icon = pCfg.icon;
                    const pct = a.quota > 0 ? Math.min(100, Math.round((a.submitted/a.quota)*100)) : 0;
                    return (
                      <tr key={a.id} className="hover:bg-muted/20 group transition-colors">
                        <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">{a.class_name}</td>
                        <td className="px-5 py-3.5 text-[13px] text-foreground/80">{a.discipline_name}</td>
                        <td className="px-5 py-3.5 text-[13px] text-foreground/80">{a.teacher_name.split(" ")[0]}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {a.quota > 0 ? (
                              <>
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width:`${pct}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground">{a.submitted}/{a.quota}</span>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">{a.submitted} enviadas</span>
                            )}
                            <Icon size={13} className={pCfg.class} />
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {!isLocked && (
                            <button onClick={() => removerAtribuicaoProfessor(a.id, simulado.id).then(r => { if(r.error) toast.error(r.error); else { toast.success(r.success); startTransition(() => router.refresh()); }})}
                              className="p-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-red-500/10 rounded-lg transition-all">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ABA: CADERNOS ───────────────────────────────────────────────────── */}
      {tab === "cadernos" && (
        <div className="space-y-4">
          {/* Aviso se não gerado */}
          {!["generated","published","archived"].includes(simulado.status) && (
            <div className="bg-card border border-border/60 rounded-2xl p-6 text-center">
              <AlertCircle size={24} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                O simulado precisa estar no status <span className="font-black">Gerado</span> para baixar os cadernos.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Trave o simulado e clique em "Gerar PDF".
              </p>
            </div>
          )}

          {["generated","published","archived"].includes(simulado.status) && (
            <>
              {/* ─ Em Branco ─────────────────────────────────────────────── */}
              <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-foreground">Em Branco</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sem dados de aluno — selecione a turma para filtrar as questões corretas.
                  </p>
                </div>
                <select
                  value={blankClassId}
                  onChange={e => setBlankClassId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Selecione a turma —</option>
                  {classes.map(c => (
                    <option key={c.class_id} value={String(c.class_id)}>{c.class_name}</option>
                  ))}
                </select>
                <div className="flex gap-2 flex-wrap">
                  {blankClassId ? (
                    <>
                      <a href={`/api/exams/${simulado.id}/pdf?type=booklet&class_id=${blankClassId}&blank=1`} download
                        className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95">
                        <BookOpen size={13} /> Caderno em Branco
                      </a>
                      <a href={`/api/exams/${simulado.id}/pdf?type=omr&class_id=${blankClassId}&blank=1`} download
                        className="flex items-center gap-2 h-9 px-4 bg-secondary text-white rounded-xl font-bold text-xs hover:bg-secondary/90 transition-all active:scale-95">
                        <FileText size={13} /> Folha em Branco
                      </a>
                    </>
                  ) : (
                    <>
                      <button disabled
                        className="flex items-center gap-2 h-9 px-4 bg-primary/40 text-white rounded-xl font-bold text-xs cursor-not-allowed">
                        <BookOpen size={13} /> Caderno em Branco
                      </button>
                      <button disabled
                        className="flex items-center gap-2 h-9 px-4 bg-secondary/40 text-white rounded-xl font-bold text-xs cursor-not-allowed">
                        <FileText size={13} /> Folha em Branco
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ─ Por Turma ─────────────────────────────────────────────── */}
              {classes.length > 0 && (
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/40">
                    <h3 className="text-sm font-black text-foreground">Por Turma</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      PDFs com dados dos alunos pré-preenchidos, filtrados pelas questões de cada turma.
                    </p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {classes.map((c) => {
                      const approvedForClass = questions.filter(
                        (q) => q.state === "approved" && q.class_name === c.class_name
                      ).length;
                      const expanded = turmasExpandidas[c.class_id] ?? false;
                      const alunos = alunosPorTurma[c.class_id] ?? [];
                      const loading = loadingAlunos[c.class_id] ?? false;
                      const hasQ = approvedForClass > 0;

                      return (
                        <div key={c.id} className="divide-y divide-border/20">
                          {/* Linha da turma */}
                          <div className="px-5 py-3.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{c.class_name}</p>
                                <p className="text-xs text-muted-foreground">{approvedForClass} questões aprovadas</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Todos os alunos da turma */}
                                <a
                                  href={hasQ ? `/api/exams/${simulado.id}/pdf?type=booklet&class_id=${c.class_id}` : undefined}
                                  download={hasQ}
                                  aria-disabled={!hasQ}
                                  className={`flex items-center gap-1.5 h-8 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                                    !hasQ ? "bg-muted text-muted-foreground/40 pointer-events-none" : "bg-primary/10 text-primary hover:bg-primary/20"
                                  }`}>
                                  <BookOpen size={12} /> Cadernos
                                </a>
                                <a
                                  href={hasQ ? `/api/exams/${simulado.id}/pdf?type=omr&class_id=${c.class_id}` : undefined}
                                  download={hasQ}
                                  aria-disabled={!hasQ}
                                  className={`flex items-center gap-1.5 h-8 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                                    !hasQ ? "bg-muted text-muted-foreground/40 pointer-events-none" : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                                  }`}>
                                  <FileText size={12} /> Folhas
                                </a>
                                {/* Expandir por aluno */}
                                <button
                                  onClick={() => toggleTurma(c.class_id)}
                                  className="flex items-center gap-1 h-8 px-3 rounded-xl font-bold text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                  {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
                                  Por aluno
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Lista de alunos expandida */}
                          {expanded && (
                            <div className="bg-muted/20 divide-y divide-border/20">
                              {alunos.length === 0 && (
                                <p className="px-8 py-3 text-xs text-muted-foreground italic">Nenhum aluno encontrado nesta turma.</p>
                              )}
                              {alunos.map((aluno) => (
                                <div key={aluno.id} className="flex items-center justify-between px-8 py-2.5">
                                  <div>
                                    <p className="text-xs font-medium text-foreground">{aluno.name}</p>
                                    <p className="text-xs text-muted-foreground/70">R.A. {aluno.ra}</p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <a
                                      href={hasQ ? `/api/exams/${simulado.id}/pdf?type=booklet&student_id=${aluno.id}&class_id=${c.class_id}` : undefined}
                                      download={hasQ}
                                      aria-disabled={!hasQ}
                                      className={`flex items-center gap-1 h-7 px-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                                        !hasQ ? "bg-muted text-muted-foreground/40 pointer-events-none" : "bg-primary/10 text-primary hover:bg-primary/20"
                                      }`}>
                                      <BookOpen size={11} /> Caderno
                                    </a>
                                    <a
                                      href={hasQ ? `/api/exams/${simulado.id}/pdf?type=omr&student_id=${aluno.id}&class_id=${c.class_id}` : undefined}
                                      download={hasQ}
                                      aria-disabled={!hasQ}
                                      className={`flex items-center gap-1 h-7 px-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                                        !hasQ ? "bg-muted text-muted-foreground/40 pointer-events-none" : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                                      }`}>
                                      <FileText size={11} /> Folha
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ABA: QUESTÕES ───────────────────────────────────────────────────── */}
      {tab === "questoes" && (
        <div className="space-y-3">
          {/* Barra de ações */}
          {questions.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span><span className="font-black text-emerald-600 dark:text-emerald-400">{questions.filter(q => q.state === "approved").length}</span> aprovadas</span>
                <span className="text-muted-foreground/30">·</span>
                <span><span className="font-black text-foreground">{questions.filter(q => q.state !== "approved").length}</span> pendentes</span>
              </div>
              <div className="flex items-center gap-2">
                {questions.some(q => q.state !== "approved") && (
                  <button onClick={handleAprovarTodas} disabled={isPending}
                    className="flex items-center gap-1.5 h-8 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-60">
                    <CheckCircle2 size={13} /> Aprovar Todas
                  </button>
                )}
                <button onClick={handleApagarTodas} disabled={isPending}
                  className="flex items-center gap-1.5 h-8 px-3 bg-destructive/10 text-destructive rounded-xl font-bold text-xs hover:bg-destructive/20 transition-all active:scale-95 disabled:opacity-60">
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Apagar Todas
                </button>
              </div>
            </div>
          )}
          {questions.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl py-12 text-center">
              <FileText size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma questão enviada ainda.</p>
            </div>
          ) : (
            questions.map((q) => {
              const stn = questionStateCfg[q.state] ?? { label: q.state, class:"bg-muted text-muted-foreground" };
              const opts: Array<{label:string;text:string}> = JSON.parse(q.options || "[]");
              const imgs: string[] = (() => { try { return JSON.parse(q.images ?? "[]"); } catch { return []; } })();
              const isOpen = expandedQ[q.id];
              return (
                <div key={q.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-5 py-4">
                    <button onClick={() => setExpandedQ(prev => ({...prev, [q.id]: !prev[q.id]}))}
                      className="flex items-start gap-3 flex-1 text-left">
                      <ChevronDown size={15} className={`mt-0.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                      <div className="min-w-0">
                        <RichText text={q.stem} className="text-sm text-foreground line-clamp-2" />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {q.teacher_name} · {q.discipline_name} · {q.class_name}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stn.class}`}>{stn.label}</span>
                      {q.state !== "approved" && (
                        <button onClick={() => handleApprove(q.id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors" title="Aprovar">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {q.state !== "rejected" && (
                        <button onClick={() => handleReject(q.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Rejeitar">
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-3 border-t border-border/30">
                      {imgs.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3">
                          {imgs.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="" className="max-h-48 max-w-full rounded border border-border/40 object-contain" />
                          ))}
                        </div>
                      )}
                      {opts.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {opts.map(o => (
                            <div key={o.label} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${q.correct_label === o.label ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-muted/30"}`}>
                              <span className={`text-xs font-black w-5 shrink-0 ${q.correct_label === o.label ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{o.label}</span>
                              <RichText text={o.text} className="text-sm text-foreground/80" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-muted-foreground">Gabarito:</span>
                        {opts.map(o => (
                          <button key={o.label} onClick={() => handleGabarito(q.id, o.label)}
                            className={`w-7 h-7 rounded-full text-xs font-black transition-all ${q.correct_label === o.label ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"}`}>
                            {o.label}
                          </button>
                        ))}
                        {opts.length === 0 && (
                          <input defaultValue={q.correct_label ?? ""} placeholder="Gabarito"
                            onBlur={e => e.target.value && handleGabarito(q.id, e.target.value.toUpperCase())}
                            className="h-7 w-20 px-2 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-primary" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
