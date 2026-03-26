"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, Lock, CheckCircle, Trash2,
  Plus, Hash, BarChart2, AlignLeft, Search, X
} from "lucide-react";
import {
  atualizarStatusSimulado, adicionarItemAoSimulado,
  removerItemDoSimulado
} from "@/lib/actions";
import { toast } from "sonner";

type Simulado = {
  id: number;
  title: string;
  status: string;
  created_at: Date;
  opened_at: Date | null;
  closed_at: Date | null;
};

type Questao = {
  eq_id: number;
  position: number;
  answer_key: string | null;
  item_id: number;
  stem: string;
  item_type: string;
  difficulty: string;
  discipline_name: string;
  skill_code: string | null;
};

type Item = {
  id: number;
  stem: string;
  difficulty: string;
  item_type: string;
  discipline_name: string;
  skill_code: string | null;
};

interface Props {
  simulado: Simulado;
  questoes: Questao[];
  itensDisponiveis: Item[];
}

const statusFlow: Record<string, { next: string; label: string; icon: React.ElementType; class: string } | null> = {
  draft:  { next: "open",   label: "Abrir Simulado",  icon: Play,         class: "bg-secondary text-white hover:bg-secondary/90" },
  open:   { next: "closed", label: "Encerrar",        icon: Lock,         class: "bg-red-500 text-white hover:bg-red-600" },
  closed: { next: "graded", label: "Marcar Corrigido",icon: CheckCircle,  class: "bg-primary text-white hover:bg-primary/90" },
  graded: null,
};

const diffColor: Record<string, string> = {
  EASY:   "text-emerald-600 dark:text-emerald-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HARD:   "text-red-600 dark:text-red-400",
};

const typeIcon: Record<string, React.ElementType> = {
  MULTIPLE_CHOICE: BarChart2,
  DISCURSIVE: AlignLeft,
  NUMERIC: Hash,
};

export function SimuladoDetalheClient({ simulado, questoes, itensDisponiveis }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [search, setSearch] = useState("");

  const isDraft = simulado.status === "draft";
  const nextAction = statusFlow[simulado.status];

  const filtered = itensDisponiveis.filter(
    (i) => !questoes.some((q) => q.item_id === i.id) &&
      i.stem.toLowerCase().includes(search.toLowerCase())
  );

  async function handleStatusChange() {
    if (!nextAction) return;
    const res = await atualizarStatusSimulado(simulado.id, nextAction.next as any);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  async function handleAddItem(itemId: number) {
    const res = await adicionarItemAoSimulado(simulado.id, itemId);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  async function handleRemoveItem(eqId: number) {
    const res = await removerItemDoSimulado(eqId, simulado.id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); startTransition(() => router.refresh()); }
  }

  const statusLabels: Record<string, string> = {
    draft: "Rascunho", open: "Aberto", closed: "Encerrado", graded: "Corrigido"
  };
  const statusClass: Record<string, string> = {
    draft:  "bg-muted text-muted-foreground",
    open:   "bg-secondary/10 text-secondary",
    closed: "bg-red-500/10 text-red-600 dark:text-red-400",
    graded: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/simulados" className="mt-1 p-2 rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{simulado.title}</h1>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${statusClass[simulado.status]}`}>
              {statusLabels[simulado.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {questoes.length} {questoes.length === 1 ? "questão" : "questões"} ·{" "}
            Criado em {new Date(simulado.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {nextAction && (
          <button
            onClick={handleStatusChange}
            disabled={isPending}
            className={`flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${nextAction.class}`}
          >
            <nextAction.icon size={15} />
            {nextAction.label}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questões do simulado */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Questões</h2>
            {isDraft && (
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={13} />
                Adicionar item
              </button>
            )}
          </div>

          {questoes.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl py-12 text-center">
              <Hash size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma questão adicionada.</p>
              {isDraft && (
                <button onClick={() => setShowAddPanel(true)} className="mt-2 text-xs font-bold text-primary hover:underline">
                  Adicionar do banco de itens →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {questoes.map((q) => {
                const TypeIcon = typeIcon[q.item_type] ?? Hash;
                return (
                  <div key={q.eq_id} className="bg-card border border-border/60 rounded-xl px-5 py-4 flex items-start gap-3 group hover:border-primary/20 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {q.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">{q.stem}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">{q.discipline_name}</span>
                        {q.skill_code && (
                          <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {q.skill_code}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold ${diffColor[q.difficulty]}`}>
                          {q.difficulty === "EASY" ? "Fácil" : q.difficulty === "MEDIUM" ? "Médio" : "Difícil"}
                        </span>
                        <TypeIcon size={11} className="text-muted-foreground" />
                      </div>
                    </div>
                    {isDraft && (
                      <button
                        onClick={() => handleRemoveItem(q.eq_id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel de adicionar itens */}
        {showAddPanel && isDraft && (
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
              <h3 className="font-black text-sm text-foreground">Banco de Itens</h3>
              <button onClick={() => setShowAddPanel(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <div className="px-3 py-2 border-b border-border/30 shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-background border border-border text-xs focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">
                  {itensDisponiveis.length === 0 ? "Nenhum item no banco." : "Todos os itens já foram adicionados."}
                </p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item.id)}
                    disabled={isPending}
                    className="w-full text-left px-4 py-3 border-b border-border/20 hover:bg-muted/30 transition-colors disabled:opacity-50 last:border-0"
                  >
                    <p className="text-xs text-foreground line-clamp-2">{item.stem}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.discipline_name}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
