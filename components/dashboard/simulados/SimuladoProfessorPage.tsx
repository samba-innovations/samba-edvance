"use client";

import { useState, useTransition, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, ChevronDown, ChevronUp, Trash2, Loader2,
  CheckCircle2, Clock, XCircle, Hash, Send, AlertCircle,
  Check, BookOpen, ArrowLeft, Upload, FileText, X, Eye,
  ChevronRight, Tag, Search, PenLine
} from "lucide-react";
import Link from "next/link";
import {
  submeterQuestaoParaTurmas,
  excluirQuestao,
  excluirMinhasQuestoes,
  parsearDocx,
  importarQuestoesDocx,
} from "@/lib/exam-actions";
import { getSkills, getExamSkills, setExamSkills } from "@/lib/skill-actions";
import { toast } from "sonner";
import { RichText } from "@/components/RichText";
import { RichTextInput } from "@/components/RichTextInput";
import { useConfirm } from "@/components/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Simulado = {
  id: number; title: string; area: string | null; status: string;
  options_count: number; answer_source: string;
};

type Assignment = {
  class_id: number; class_name: string;
  discipline_id: number; discipline_name: string;
  submitted: number; quota: number; progress_status: string;
};

type Question = {
  id: number; stem: string; state: string; correct_label: string | null;
  created_at: Date; discipline_name: string; class_name: string;
  options: string; images: string;
};

type Session = { id: number; name: string; email: string; role: string };

type ParsedQuestion = {
  stem: string;
  correctLabel: string | null;
  options: Array<{ label: string; text: string }>;
  images: string[];
  index: number;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const stateConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  submitted: { label: "Enviada",  cls: "bg-muted text-muted-foreground",                           icon: <Clock size={11} /> },
  pending:   { label: "Pendente", cls: "bg-muted text-muted-foreground",                           icon: <Clock size={11} /> },
  approved:  { label: "Aprovada", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 size={11} /> },
  rejected:  { label: "Rejeitada",cls: "bg-destructive/10 text-destructive",                       icon: <XCircle size={11} /> },
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",  cls: "bg-muted text-muted-foreground" },
  collecting: { label: "Coletando", cls: "bg-secondary/10 text-secondary" },
  review:     { label: "Revisão",   cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  locked:     { label: "Travado",   cls: "bg-primary/10 text-primary" },
  generated:  { label: "Gerado",    cls: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  published:  { label: "Publicado", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  archived:   { label: "Arquivado", cls: "bg-muted text-muted-foreground/60" },
};

const LETTERS = ["A", "B", "C", "D", "E"];
function emptyOptions(n: number) {
  return LETTERS.slice(0, n).map((l) => ({ label: l, text: "" }));
}

// ─── TurmaModal ───────────────────────────────────────────────────────────────

interface TurmaModalProps {
  assignments: Assignment[];
  onConfirm: (targets: Array<{ classId: number; disciplineId: number }>) => void;
  onClose: () => void;
  loading?: boolean;
  title?: string;
}

function TurmaModal({ assignments, onConfirm, onClose, loading, title }: TurmaModalProps) {
  const byDisc = useMemo(() => {
    const map = new Map<number, { id: number; name: string; classes: Assignment[] }>();
    for (const a of assignments) {
      if (!map.has(a.discipline_id))
        map.set(a.discipline_id, { id: a.discipline_id, name: a.discipline_name, classes: [] });
      map.get(a.discipline_id)!.classes.push(a);
    }
    return Array.from(map.values());
  }, [assignments]);

  const [discId, setDiscId] = useState<number>(byDisc[0]?.id ?? 0);
  const currentDisc = byDisc.find((d) => d.id === discId);

  const [selected, setSelected] = useState<Set<number>>(() => {
    const first = byDisc[0];
    return new Set(
      first?.classes
        .filter((c) => !(c.quota > 0 && Number(c.submitted) >= Number(c.quota)))
        .map((c) => c.class_id) ?? []
    );
  });

  function handleDiscChange(id: number) {
    setDiscId(id);
    const disc = byDisc.find((d) => d.id === id);
    setSelected(new Set(
      disc?.classes
        .filter((c) => !(c.quota > 0 && Number(c.submitted) >= Number(c.quota)))
        .map((c) => c.class_id) ?? []
    ));
  }

  function toggle(classId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(classId) ? next.delete(classId) : next.add(classId);
      return next;
    });
  }

  const availableClasses = currentDisc?.classes.filter(
    (c) => !(c.quota > 0 && Number(c.submitted) >= Number(c.quota))
  ) ?? [];
  const allSel = availableClasses.every((c) => selected.has(c.class_id));

  function toggleAll() {
    if (allSel) setSelected(new Set());
    else setSelected(new Set(availableClasses.map((c) => c.class_id)));
  }

  function handleConfirm() {
    const targets = (currentDisc?.classes ?? [])
      .filter((c) => selected.has(c.class_id))
      .map((c) => ({ classId: c.class_id, disciplineId: discId }));
    onConfirm(targets);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="font-black text-foreground">
              {title ?? "Para qual turma?"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione as turmas que receberão esta questão
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Disciplina */}
          {byDisc.length > 1 && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Disciplina</label>
              <div className="flex flex-wrap gap-2">
                {byDisc.map((d) => (
                  <button key={d.id} type="button" onClick={() => handleDiscChange(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      discId === d.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">Turmas</label>
              {availableClasses.length > 1 && (
                <button type="button" onClick={toggleAll}
                  className="text-[11px] font-bold text-primary hover:underline">
                  {allSel ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {(currentDisc?.classes ?? []).map((c) => {
                const full = c.quota > 0 && Number(c.submitted) >= Number(c.quota);
                const checked = selected.has(c.class_id);
                return (
                  <button key={c.class_id} type="button"
                    disabled={full}
                    onClick={() => toggle(c.class_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      full
                        ? "border-border/30 opacity-40 cursor-not-allowed"
                        : checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                      checked ? "bg-primary" : "border border-muted-foreground/40 bg-background"
                    }`}>
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{c.class_name}</span>
                    {c.quota > 0 && (
                      <span className={`text-[11px] font-bold tabular-nums ${
                        full ? "text-muted-foreground/40"
                          : Number(c.submitted) >= Number(c.quota) * 0.8 ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}>
                        {Number(c.submitted)}/{Number(c.quota)}
                      </span>
                    )}
                    {full && <span className="text-[10px] font-black text-muted-foreground/50">Cheio</span>}
                  </button>
                );
              })}
            </div>

            {selected.size > 0 && (
              <p className="text-[11px] text-muted-foreground pt-1">
                {selected.size === 1
                  ? "1 turma selecionada"
                  : `${selected.size} turmas selecionadas`}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-bold hover:bg-muted/50 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || loading}
            className="flex-1 h-10 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

function QuestionCard({ q, examId, teacherId }: { q: Question; examId: number; teacherId: number }) {
  const router = useRouter();
  const { confirmDialog, askConfirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const opts: Array<{ label: string; text: string }> = (() => {
    try { return JSON.parse(q.options); } catch { return []; }
  })();
  const images: string[] = (() => {
    try { return JSON.parse(q.images ?? "[]"); } catch { return []; }
  })();

  const cfg = stateConfig[q.state] ?? stateConfig.pending;

  async function handleDelete() {
    if (!await askConfirm("Remover esta questão?")) return;
    startTransition(async () => {
      const res = await excluirQuestao(q.id, examId, teacherId);
      if (res.error) toast.error(res.error);
      else { toast.success(res.success); router.refresh(); }
    });
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {confirmDialog}
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((o) => !o)}>
        <div className="flex-1 min-w-0">
          <RichText text={q.stem} className="text-sm font-medium text-foreground line-clamp-2" />
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${cfg.cls}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-[11px] text-muted-foreground">{q.discipline_name}</span>
            <span className="text-[11px] text-muted-foreground/40">•</span>
            <span className="text-[11px] text-muted-foreground">{q.class_name}</span>
            {q.correct_label && (
              <>
                <span className="text-[11px] text-muted-foreground/40">•</span>
                <span className="text-[11px] text-muted-foreground">
                  Gabarito: <span className="font-black text-primary">{q.correct_label}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {q.state !== "approved" && (
            <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={pending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          )}
          {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-border/30 px-4 py-3 bg-muted/10 space-y-2">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="max-h-48 max-w-full rounded border border-border/40 object-contain" />
              ))}
            </div>
          )}
          {opts.map((o) => (
            <div key={o.label} className="flex items-start gap-2.5 text-sm">
              <span className={`w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 ${
                q.correct_label === o.label ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>{o.label}</span>
              <RichText text={o.text} className="text-foreground/80 pt-0.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ParsedQuestionPreview ────────────────────────────────────────────────────

function ParsedQuestionPreview({
  q,
  selected,
  onToggle,
}: {
  q: ParsedQuestion;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      selected ? "border-primary/40 bg-primary/3" : "border-border/50"
    }`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <button type="button" onClick={onToggle}
          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            selected ? "bg-primary" : "border border-muted-foreground/40"
          }`}>
          {selected && <Check size={11} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen((o) => !o)}>
          <RichText text={q.stem} className="text-sm text-foreground line-clamp-2" />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-muted-foreground">{q.options.length} alternativas</span>
            {q.images.length > 0 && (
              <span className="text-[11px] text-muted-foreground">· {q.images.length} imagem(ns)</span>
            )}
            {q.correctLabel && (
              <span className="text-[11px] text-muted-foreground">
                · Gabarito: <span className="font-black text-primary">{q.correctLabel}</span>
              </span>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="p-1 text-muted-foreground shrink-0">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/30 px-4 py-3 bg-muted/5 space-y-1.5">
          {q.images.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {q.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="max-h-40 max-w-full rounded border border-border/40 object-contain" />
              ))}
            </div>
          )}
          {q.options.map((o) => (
            <div key={o.label} className="flex items-start gap-2 text-xs">
              <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                q.correctLabel === o.label ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>{o.label}</span>
              <RichText text={o.text} className="text-foreground/80 pt-0.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DocxImport ───────────────────────────────────────────────────────────────

interface DocxImportProps {
  simulado: Simulado;
  assignments: Assignment[];
  embedded?: boolean;
}

function DocxImport({ simulado, assignments, embedded }: DocxImportProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestion[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setSelectedIdx(new Set());
    setParsing(true);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("exam_id", String(simulado.id));

    const res = await parsearDocx(fd);
    setParsing(false);

    if (res.error) { toast.error(res.error); return; }
    if (res.questions) {
      setParsed(res.questions);
      setSelectedIdx(new Set(res.questions.map((_, i) => i)));
      toast.success(res.success);
    }
  }

  function toggleQuestion(idx: number) {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  async function handleImport(targets: Array<{ classId: number; disciplineId: number }>) {
    if (!parsed) return;
    const questions = parsed.filter((_, i) => selectedIdx.has(i));
    setImporting(true);

    const res = await importarQuestoesDocx({
      examId: simulado.id,
      questions,
      targets,
    });
    setImporting(false);
    setShowModal(false);

    if (res.error) { toast.error(res.error); return; }
    toast.success(res.success);
    setParsed(null);
    setSelectedIdx(new Set());
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  const canImport = parsed && selectedIdx.size > 0;

  return (
    <div className={embedded ? "" : "bg-card border border-border/60 rounded-2xl overflow-hidden"}>
      {!embedded && (
        <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
          <FileText size={16} className="text-muted-foreground" />
          <h2 className="font-black text-foreground">Importar por DOCX</h2>
        </div>
      )}

      <div className={`${embedded ? "p-5" : "p-6"} space-y-4`}>
        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/3 transition-all"
          onClick={() => fileRef.current?.click()}>
          <Upload size={24} className="mx-auto text-muted-foreground/40 mb-2" />
          {fileName ? (
            <p className="text-sm font-medium text-foreground">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Clique para selecionar um arquivo .docx</p>
              <p className="text-xs text-muted-foreground mt-1">
                Suporta fórmulas LaTeX (OMML) e imagens
              </p>
            </>
          )}
          {parsing && (
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Analisando arquivo...
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Preview */}
        {parsed && parsed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                {parsed.length} questão(ões) encontrada(s)
              </p>
              <button type="button"
                onClick={() => {
                  if (selectedIdx.size === parsed.length) setSelectedIdx(new Set());
                  else setSelectedIdx(new Set(parsed.map((_, i) => i)));
                }}
                className="text-[11px] font-bold text-primary hover:underline">
                {selectedIdx.size === parsed.length ? "Desmarcar todas" : "Selecionar todas"}
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parsed.map((q, i) => (
                <ParsedQuestionPreview
                  key={i}
                  q={q}
                  selected={selectedIdx.has(i)}
                  onToggle={() => toggleQuestion(i)}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!canImport || importing}
              onClick={() => setShowModal(true)}
              className="w-full h-11 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Importar {selectedIdx.size > 0 ? `${selectedIdx.size} questão(ões)` : ""}
            </button>
          </div>
        )}

        <div className="text-xs text-muted-foreground/60 space-y-1">
          <p className="font-bold">Formato esperado:</p>
          <p>1. Enunciado da questão</p>
          <p>a) Alternativa A &nbsp; b) Alternativa B &nbsp; ...</p>
          <p>*gabarito: A</p>
        </div>
      </div>

      {showModal && (
        <TurmaModal
          assignments={assignments}
          title={`Para onde enviar ${selectedIdx.size} questão(ões)?`}
          loading={importing}
          onConfirm={handleImport}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── ManualForm ───────────────────────────────────────────────────────────────

interface ManualFormProps {
  simulado: Simulado;
  assignments: Assignment[];
  embedded?: boolean;
}

type Skill = { id: number; code: string; description: string; area: string | null };

function ManualForm({ simulado, assignments, embedded }: ManualFormProps) {
  const router = useRouter();

  const [stem, setStem] = useState("");
  const [stemImages, setStemImages] = useState<string[]>([]);
  const [options, setOptions] = useState(() => emptyOptions(simulado.options_count));
  const [optImages, setOptImages] = useState<string[][]>(() => emptyOptions(simulado.options_count).map(() => []));
  const [correctLabel, setCorrectLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  function validate() {
    if (!stem.trim()) { setError("Enunciado é obrigatório."); return false; }
    return true;
  }

  async function handleSend(targets: Array<{ classId: number; disciplineId: number }>) {
    setSubmitting(true);
    const structuredImages = {
      stem: stemImages,
      options: Object.fromEntries(options.map((opt, i) => [opt.label, optImages[i] ?? []])),
    };
    const res = await submeterQuestaoParaTurmas({
      examId: simulado.id,
      targets,
      stem: stem.trim(),
      correctLabel,
      options,
      images: structuredImages,
    });
    setSubmitting(false);
    setShowModal(false);

    if (res.error) { setError(res.error); toast.error(res.error); return; }
    toast.success(res.success);
    setStem("");
    setStemImages([]);
    setOptions(emptyOptions(simulado.options_count));
    setOptImages(emptyOptions(simulado.options_count).map(() => []));
    setCorrectLabel(null);
    setError("");
    router.refresh();
  }

  return (
    <>
      <div className={embedded ? "" : "bg-card border border-border/60 rounded-2xl overflow-hidden"}>
        {!embedded && (
          <div className="px-6 py-4 border-b border-border/40">
            <h2 className="font-black text-foreground">Nova Questão</h2>
          </div>
        )}

        <div className={`${embedded ? "p-5" : "p-6"} space-y-5`}>
          {/* Enunciado */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
              Enunciado <span className="text-destructive">*</span>
            </label>
            <RichTextInput
              value={stem}
              onChange={setStem}
              images={stemImages}
              onImagesChange={setStemImages}
              examId={simulado.id}
              rows={4}
              placeholder="Digite o enunciado da questão... Use $formula$ para LaTeX."
            />
          </div>

          {/* Alternativas */}
          <div className="space-y-3">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
              Alternativas
              <span className="text-muted-foreground/50 font-normal ml-1">(clique na letra para marcar gabarito)</span>
            </label>
            {options.map((opt, i) => (
              <div key={opt.label} className="flex items-start gap-3">
                <button type="button"
                  onClick={() => setCorrectLabel(correctLabel === opt.label ? null : opt.label)}
                  className={`w-8 h-8 rounded-lg text-xs font-black shrink-0 mt-1 transition-all border ${
                    correctLabel === opt.label
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}>
                  {opt.label}
                </button>
                <div className="flex-1">
                  <RichTextInput
                    value={opt.text}
                    onChange={(v) => {
                      const next = [...options];
                      next[i] = { ...next[i], text: v };
                      setOptions(next);
                    }}
                    images={optImages[i] ?? []}
                    onImagesChange={(imgs) => {
                      const next = [...optImages];
                      next[i] = imgs;
                      setOptImages(next);
                    }}
                    examId={simulado.id}
                    rows={2}
                    placeholder={`Alternativa ${opt.label}... Use $formula$ para LaTeX.`}
                  />
                </div>
              </div>
            ))}
            {correctLabel && (
              <p className="text-[11px] text-muted-foreground">
                Gabarito: <span className="font-black text-primary">{correctLabel}</span>
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <button
            type="button"
            disabled={submitting}
            onClick={() => { if (validate()) setShowModal(true); }}
            className="w-full h-11 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Enviar Questão
          </button>
        </div>
      </div>

      {showModal && (
        <TurmaModal
          assignments={assignments}
          loading={submitting}
          onConfirm={handleSend}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ─── ExamSkillsPicker ─────────────────────────────────────────────────────────

function ExamSkillsPicker({ examId }: { examId: number }) {
  const [open, setOpen] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (loaded) return;
    const [all, current] = await Promise.all([getSkills(), getExamSkills(examId)]);
    setAllSkills(all as Skill[]);
    const currentIds = new Set((current as Array<{ skill_id: number }>).map(s => s.skill_id));
    setSelected((all as Skill[]).filter(s => currentIds.has(s.id)));
    setLoaded(true);
  }

  async function toggle(skill: Skill) {
    const next = selected.find(s => s.id === skill.id)
      ? selected.filter(s => s.id !== skill.id)
      : [...selected, skill];
    setSelected(next);
    setSaving(true);
    await setExamSkills(examId, next.map(s => s.id));
    setSaving(false);
  }

  const filtered = allSkills.filter(s => {
    const q = search.toLowerCase();
    return !q || s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.area ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); if (!loaded) load(); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag size={15} className="text-primary" />
          <span className="text-sm font-black text-foreground">Habilidades BNCC</span>
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          {selected.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] font-black px-2 py-0.5 rounded-full">
              {selected.length} selecionada{selected.length > 1 ? "s" : ""}
            </span>
          )}
          {saving && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/40 p-5 space-y-3">
          {/* Tags selecionadas */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full border border-primary/20">
                  {s.code}
                  <button type="button" onClick={() => toggle(s)} className="hover:text-destructive transition-colors ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Busca */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código, área ou descrição..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          {!loaded ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {filtered.slice(0, 80).map(s => {
                const sel = !!selected.find(x => x.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs ${
                      sel ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${sel ? "bg-primary border-primary" : "border-border"}`}>
                      {sel && <Check size={10} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <span className={`font-black ${sel ? "text-primary" : "text-foreground"}`}>{s.code}</span>
                      {s.area && <span className="text-muted-foreground ml-1.5 text-[10px]">{s.area}</span>}
                      <p className="text-muted-foreground line-clamp-1 mt-0.5">{s.description}</p>
                    </div>
                  </button>
                );
              })}
              {filtered.length > 80 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  Refine a busca ({filtered.length} encontradas)
                </p>
              )}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma habilidade encontrada</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DeleteAllButton ──────────────────────────────────────────────────────────

function DeleteAllButton({ examId }: { examId: number }) {
  const router = useRouter();
  const { confirmDialog, askConfirm } = useConfirm();
  const [pending, startTransition] = useTransition();

  async function handleClick() {
    if (!await askConfirm("Apagar todas as questões não aprovadas? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const res = await excluirMinhasQuestoes(examId);
      if (res.error) toast.error(res.error);
      else { toast.success(res.success); router.refresh(); }
    });
  }

  return (
    <>
      {confirmDialog}
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs font-bold text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Apagar todas
      </button>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SimuladoProfessorPage({ simulado, assignments, questions, session }: {
  simulado: Simulado;
  assignments: Assignment[];
  questions: Question[];
  session: Session;
}) {
  const [formTab, setFormTab] = useState<"manual" | "docx">("manual");
  const [qFilter, setQFilter] = useState<"all" | "submitted" | "approved" | "rejected">("all");

  const statusCfg    = statusConfig[simulado.status] ?? { label: simulado.status, cls: "bg-muted text-muted-foreground" };
  const totalSubmitted = assignments.reduce((s, a) => s + Number(a.submitted), 0);
  const totalQuota     = assignments.reduce((s, a) => s + Number(a.quota), 0);
  const totalApproved  = questions.filter(q => q.state === "approved").length;
  const totalPct       = totalQuota > 0 ? Math.min(100, Math.round((totalSubmitted / totalQuota) * 100)) : 0;
  const isCollecting   = simulado.status === "collecting" || simulado.status === "review";

  const filteredQuestions = questions.filter(q => {
    if (qFilter === "all") return true;
    if (qFilter === "submitted") return q.state === "submitted" || q.state === "pending";
    if (qFilter === "approved") return q.state === "approved";
    if (qFilter === "rejected") return q.state === "rejected";
    return true;
  });

  const qCounts = {
    all: questions.length,
    submitted: questions.filter(q => q.state === "submitted" || q.state === "pending").length,
    approved: questions.filter(q => q.state === "approved").length,
    rejected: questions.filter(q => q.state === "rejected").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/simulados"
          className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-foreground tracking-tight truncate">{simulado.title}</h1>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>
          {simulado.area && <p className="text-xs text-muted-foreground mt-0.5">{simulado.area}</p>}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-card border border-border/60 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xl font-black text-foreground">{assignments.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Turmas</p>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">Progresso geral</span>
              <span className="font-black text-foreground tabular-nums">
                {totalSubmitted}{totalQuota > 0 ? `/${totalQuota}` : ""} enviadas
                {totalApproved > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-2">· {totalApproved} aprovadas</span>}
              </span>
            </div>
            {totalQuota > 0 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${totalPct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert when not collecting */}
      {!isCollecting && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-3.5">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            Simulado não está aceitando questões no momento — status: <span className="font-black">{statusCfg.label}</span>
          </p>
        </div>
      )}

      {assignments.length === 0 && isCollecting ? (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center">
          <ClipboardList size={28} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Você não possui atribuições neste simulado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Coluna Esquerda ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Progresso por turma */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40 bg-muted/20">
                <h2 className="text-xs font-black text-foreground uppercase tracking-wider">Progresso por Turma</h2>
              </div>
              <div className="divide-y divide-border/20">
                {assignments.map((a, i) => {
                  const pct  = a.quota > 0 ? Math.min(100, Math.round((Number(a.submitted) / Number(a.quota)) * 100)) : 0;
                  const done = a.progress_status === "complete";
                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{a.discipline_name}</p>
                          <p className="text-[10px] text-muted-foreground">{a.class_name}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-xs font-black text-foreground tabular-nums">
                            {Number(a.submitted)}{a.quota > 0 ? `/${Number(a.quota)}` : ""}
                          </p>
                          {done && <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><Check size={10} />Completo</p>}
                        </div>
                      </div>
                      {a.quota > 0 && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Habilidades BNCC */}
            {isCollecting && <ExamSkillsPicker examId={simulado.id} />}

            {/* Formulários em tabs */}
            {isCollecting && (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                {/* Tab switcher */}
                <div className="flex border-b border-border/40">
                  {(["manual", "docx"] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFormTab(tab)}
                      className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
                        formTab === tab
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {tab === "manual" ? <PenLine size={12} /> : <FileText size={12} />}
                        {tab === "manual" ? "Manual" : "Importar DOCX"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-0">
                  {formTab === "manual"
                    ? <ManualForm simulado={simulado} assignments={assignments} embedded />
                    : <DocxImport simulado={simulado} assignments={assignments} embedded />
                  }
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna Direita: Questões ── */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Header + filtros */}
              <div className="px-5 py-4 border-b border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-foreground">Minhas Questões</h2>
                  {questions.some(q => q.state !== "approved") && (
                    <DeleteAllButton examId={simulado.id} />
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    ["all", "Todas"],
                    ["submitted", "Pendentes"],
                    ["approved", "Aprovadas"],
                    ["rejected", "Rejeitadas"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQFilter(key)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                        qFilter === key
                          ? "bg-primary text-white border-primary"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                      {qCounts[key] > 0 && (
                        <span className={`ml-1 opacity-70`}>{qCounts[key]}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList size={28} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {questions.length === 0 ? "Nenhuma questão enviada ainda." : "Nenhuma questão neste filtro."}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredQuestions.map(q => (
                    <QuestionCard key={q.id} q={q} examId={simulado.id} teacherId={session.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
