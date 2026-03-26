"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, LayoutTemplate, X, Loader2, Calendar, ClipboardList, Trash2
} from "lucide-react";
import { criarMatriz, excluirMatriz } from "@/lib/actions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type Matriz = {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  owner_name: string | null;
  exam_count: bigint;
};

type Disciplina = { id: number; name: string };

interface Props {
  matrizes: Matriz[];
  disciplinas: Disciplina[];
}

function NovaMatrizModal({
  disciplinas,
  onClose,
}: {
  disciplinas: Disciplina[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<Record<number, number>>({});

  const [state, action, isPending] = useActionState(async (_prev: any, fd: FormData) => {
    fd.set("config_json", JSON.stringify(config));
    const res = await criarMatriz(_prev, fd);
    if (res.success) { toast.success(res.success); router.refresh(); onClose(); }
    if (res.error) toast.error(res.error);
    return res;
  }, null);

  function setQtd(discId: number, val: string) {
    const n = Number(val);
    setConfig((prev) => {
      if (!n) { const next = { ...prev }; delete next[discId]; return next; }
      return { ...prev, [discId]: n };
    });
  }

  const total = Object.values(config).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 shrink-0">
          <h2 className="font-black text-foreground">Nova Matriz</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form action={action} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                name="name"
                required
                autoFocus
                placeholder="Ex: Matriz ENEM — Ciências da Natureza"
                className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Descrição opcional..."
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all resize-none"
              />
            </div>

            {/* Distribuição por disciplina */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Questões por disciplina
                </label>
                {total > 0 && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Total: {total}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {disciplinas.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{d.name}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config[d.id] ?? ""}
                      onChange={(e) => setQtd(d.id, e.target.value)}
                      placeholder="0"
                      className="w-20 h-9 px-3 rounded-xl bg-background border border-border text-sm text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-border/40 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-border font-bold text-sm hover:bg-muted/50 transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar Matriz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MatrizesClient({ matrizes, disciplinas }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { confirmDialog, askConfirm } = useConfirm();

  async function handleDelete(id: number, name: string) {
    if (!await askConfirm(`Excluir matriz "${name}"?`)) return;
    const res = await excluirMatriz(id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  return (
    <>
      {confirmDialog}
      {showModal && (
        <NovaMatrizModal disciplinas={disciplinas} onClose={() => setShowModal(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Matrizes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {matrizes.length} {matrizes.length === 1 ? "matriz" : "matrizes"} cadastradas
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 active:scale-95"
          >
            <Plus size={16} />
            Nova Matriz
          </button>
        </div>

        {/* Cards */}
        {matrizes.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl py-16 text-center">
            <LayoutTemplate size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nenhuma matriz cadastrada.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-bold text-primary hover:underline">
              Criar primeira matriz →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matrizes.map((m) => {
              let config: Record<string, number> = {};
              const examCount = Number(m.exam_count);
              return (
                <div
                  key={m.id}
                  className="bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 flex flex-col gap-4 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground text-sm leading-tight">{m.name}</h3>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList size={12} />
                      {examCount} {examCount === 1 ? "simulado" : "simulados"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>

                  {m.owner_name && (
                    <p className="text-[11px] text-muted-foreground/60">
                      Criado por {m.owner_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
