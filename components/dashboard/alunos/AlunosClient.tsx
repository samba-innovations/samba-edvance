"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition, useRef, useState } from "react";
import {
  Search, GraduationCap, Users, X, Upload, FileSpreadsheet,
  Loader2, CheckCircle2, AlertCircle, ChevronDown,
} from "lucide-react";
import { importarAlunosCSV } from "@/lib/actions";
import { toast } from "sonner";

type Aluno = {
  id: number; ra: string; dig_ra: string | null; name: string;
  class_name: string | null; is_active: boolean; call_number: number | null;
};
type Turma = {
  id: number; name: string; grade_label: string; level: string; year_number: number;
  student_count: number; discipline_count: number;
};

interface Props {
  alunos: Aluno[];
  turmas: Turma[];
  currentSearch: string;
  currentClassId?: number;
}

// ─── Modal de importação ──────────────────────────────────────────────────────

function ImportModal({ turmas, onClose }: { turmas: Turma[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Array<{ num: number; name: string; ra: string; situation: string }>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function parsePreview(text: string) {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    const hi = lines.findIndex(l => l.includes("Nome do Aluno") || l.startsWith("Nº de chamada"));
    if (hi < 0) { setPreview([]); return; }
    const rows = lines.slice(hi + 1).filter(Boolean).slice(0, 5);
    setPreview(rows.map(line => {
      const p = line.split(";");
      return {
        num: parseInt(p[0]) || 0,
        name: p[1]?.trim() ?? "",
        ra: p[2]?.trim() ?? "",
        situation: (p[7] ?? p[4] ?? "").trim(),
      };
    }).filter(r => r.name));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => parsePreview(ev.target?.result as string);
    reader.readAsText(file, "utf-8");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await importarAlunosCSV(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        setResult({ inserted: res.inserted ?? 0, updated: res.updated ?? 0 });
        toast.success(res.success);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-primary" />
            <h2 className="text-sm font-black text-foreground">Importar Alunos via CSV</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        {result ? (
          /* Resultado */
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <div>
              <p className="text-base font-black text-foreground">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-bold text-emerald-600">{result.inserted}</span> inserido{result.inserted !== 1 ? "s" : ""} ·{" "}
                <span className="font-bold text-primary">{result.updated}</span> atualizado{result.updated !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={onClose}
              className="h-9 px-6 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all">
              Fechar
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Turma */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                Turma de destino *
              </label>
              <div className="relative">
                <select name="class_id" required
                  className="w-full h-10 px-3 pr-8 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 appearance-none">
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Arquivo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                Arquivo CSV *
              </label>
              <label className={`flex items-center gap-3 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                fileName ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}>
                <Upload size={16} className={fileName ? "text-primary" : "text-muted-foreground/50"} />
                <span className={`text-sm truncate ${fileName ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {fileName || "Clique para selecionar o arquivo CSV"}
                </span>
                <input type="file" name="csv" accept=".csv,.txt" required
                  onChange={handleFile} className="hidden" />
              </label>
              <p className="text-[11px] text-muted-foreground/60">
                Formato padrão do SEDUC-SP. Separador: ponto e vírgula (;)
              </p>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  Prévia (5 primeiras linhas)
                </p>
                <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 bg-muted/40 font-bold text-muted-foreground/70">
                    <span>Nº</span><span>Nome</span><span>RA</span><span>Situação</span>
                  </div>
                  {preview.map((r, i) => (
                    <div key={i} className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 border-t border-border/30 ${
                      r.situation.toLowerCase() !== "ativo" ? "opacity-40" : ""
                    }`}>
                      <span className="text-muted-foreground w-5 text-right">{r.num}</span>
                      <span className="font-medium truncate">{r.name}</span>
                      <span className="font-mono text-muted-foreground">{r.ra}</span>
                      <span className={r.situation.toLowerCase() === "ativo" ? "text-emerald-600" : "text-muted-foreground"}>
                        {r.situation}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Alunos inativos são ignorados automaticamente.
                </p>
              </div>
            )}

            {/* Aviso */}
            <div className="flex gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Alunos já cadastrados com o mesmo R.A. serão atualizados. Alunos marcados como inativos no sistema não serão reativados.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={onClose}
                className="h-9 px-4 rounded-xl border border-border font-bold text-xs text-muted-foreground hover:bg-muted/50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="h-9 px-5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2">
                {isPending ? <><Loader2 size={13} className="animate-spin" /> Importando…</> : <><Upload size={13} /> Importar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AlunosClient({ alunos, turmas, currentSearch, currentClassId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [showImport, setShowImport] = useState(false);

  const updateParams = useCallback((search: string, classId?: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (classId) params.set("class_id", String(classId));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [router, pathname]);

  const hasCallNumber = alunos.some(a => a.call_number != null);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {showImport && <ImportModal turmas={turmas} onClose={() => setShowImport(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Alunos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {alunos.length} aluno{alunos.length !== 1 ? "s" : ""} ativos
          </p>
        </div>
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all active:scale-95">
          <FileSpreadsheet size={13} /> Importar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Buscar por nome ou R.A…"
            defaultValue={currentSearch}
            onChange={e => updateParams(e.target.value, currentClassId)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={currentClassId ?? ""}
            onChange={e => updateParams(currentSearch, e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 px-3 pr-8 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 appearance-none min-w-40"
          >
            <option value="">Todas as turmas</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        {(currentSearch || currentClassId) && (
          <button onClick={() => updateParams("", undefined)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      {alunos.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
          <GraduationCap size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {currentSearch || currentClassId
              ? "Nenhum aluno encontrado com estes filtros."
              : "Nenhum aluno cadastrado. Use \"Importar CSV\" para começar."}
          </p>
        </div>
      ) : (
        <div className={`bg-card border border-border/60 rounded-2xl overflow-hidden transition-opacity ${isPending ? "opacity-60" : ""}`}>
          {/* Cabeçalho */}
          <div className={`grid gap-3 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ${
            hasCallNumber ? "grid-cols-[2rem_auto_1fr_auto]" : "grid-cols-[auto_1fr_auto]"
          }`}>
            {hasCallNumber && <span className="text-right">Nº</span>}
            <span className="w-28">R.A.</span>
            <span>Nome</span>
            <span className="hidden sm:block">Turma</span>
          </div>

          <div className="divide-y divide-border/30">
            {alunos.map(a => (
              <div key={a.id} className={`grid gap-3 px-5 py-3 items-center hover:bg-muted/20 transition-colors ${
                hasCallNumber ? "grid-cols-[2rem_auto_1fr_auto]" : "grid-cols-[auto_1fr_auto]"
              }`}>
                {hasCallNumber && (
                  <span className="text-xs font-bold text-muted-foreground/60 text-right tabular-nums">
                    {a.call_number ?? "—"}
                  </span>
                )}
                <p className="text-xs font-mono text-muted-foreground w-28 truncate">
                  {a.dig_ra ? `${a.ra}-${a.dig_ra}` : a.ra}
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap size={13} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                </div>
                {a.class_name ? (
                  <button
                    onClick={() => updateParams("", a.class_name ? turmas.find(t => t.name === a.class_name)?.id : undefined)}
                    className="text-xs font-bold text-primary/80 hover:text-primary transition-colors hidden sm:flex items-center gap-1 whitespace-nowrap"
                  >
                    <Users size={11} /> {a.class_name}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground/50 hidden sm:block">—</p>
                )}
              </div>
            ))}
          </div>

          {alunos.length >= 200 && (
            <div className="px-5 py-3 border-t border-border/30 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                Mostrando os primeiros 200 resultados. Use os filtros para refinar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
