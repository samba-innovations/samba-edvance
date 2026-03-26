"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, Trash2, Pencil, BookOpen,
  ChevronLeft, ChevronRight, BarChart2, AlignLeft, Hash
} from "lucide-react";
import { excluirItem } from "@/lib/actions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type Item = {
  id: number;
  stem: string;
  difficulty: string;
  item_type: string;
  serie: string;
  latex: boolean;
  created_at: Date;
  discipline_name: string;
  skill_code: string | null;
  owner_name: string | null;
};

type Disciplina = { id: number; name: string };

interface Props {
  items: Item[];
  total: number;
  page: number;
  disciplinas: Disciplina[];
  filters: { disciplineId?: string; search?: string };
}

const difficultyConfig: Record<string, { label: string; class: string }> = {
  EASY:   { label: "Fácil",  class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  MEDIUM: { label: "Médio",  class: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  HARD:   { label: "Difícil", class: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const typeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  MULTIPLE_CHOICE: { label: "Múltipla Escolha", icon: BarChart2 },
  DISCURSIVE:      { label: "Discursiva",        icon: AlignLeft },
  NUMERIC:         { label: "Numérica",          icon: Hash },
};

const LIMIT = 20;

export function ItensClient({ items, total, page, disciplinas, filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [disciplineId, setDisciplineId] = useState(filters.disciplineId ?? "");
  const { confirmDialog, askConfirm } = useConfirm();

  const totalPages = Math.ceil(total / LIMIT);

  function applyFilters(newPage = 1) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (disciplineId) params.set("discipline_id", disciplineId);
    if (newPage > 1) params.set("page", String(newPage));
    startTransition(() => router.push(`/dashboard/itens?${params.toString()}`));
  }

  async function handleDelete(id: number, stem: string) {
    if (!await askConfirm(`Excluir item "${stem.slice(0, 60)}..."?`)) return;
    const res = await excluirItem(id);
    if (res.error) toast.error(res.error);
    else { toast.success(res.success); router.refresh(); }
  }

  return (
    <>
    {confirmDialog}
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Banco de Itens</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? "item cadastrado" : "itens cadastrados"}
          </p>
        </div>
        <Link
          href="/dashboard/itens/novo"
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30 active:scale-95"
        >
          <Plus size={16} />
          Novo Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Buscar no enunciado..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={disciplineId}
            onChange={(e) => { setDisciplineId(e.target.value); }}
            className="h-10 pl-10 pr-8 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all appearance-none min-w-[180px]"
          >
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => applyFilters()}
          disabled={isPending}
          className="h-10 px-5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
        >
          {isPending ? "..." : "Filtrar"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum item encontrado.</p>
            <Link href="/dashboard/itens/novo" className="inline-block mt-3 text-xs font-bold text-primary hover:underline">
              Criar primeiro item →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider">Enunciado</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden md:table-cell">Disciplina</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Nível</th>
                    <th className="text-left px-4 py-3.5 text-xs font-black text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Série</th>
                    <th className="px-4 py-3.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {items.map((item) => {
                    const diff = difficultyConfig[item.difficulty];
                    const type = typeConfig[item.item_type];
                    const TypeIcon = type?.icon;
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-4 max-w-xs">
                          <p className="font-medium text-foreground line-clamp-2 text-[13px]">{item.stem}</p>
                          {item.skill_code && (
                            <span className="text-[11px] text-muted-foreground mt-0.5 block">{item.skill_code}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="text-[13px] text-foreground/80">{item.discipline_name}</span>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            {TypeIcon && <TypeIcon size={12} />}
                            {type?.label ?? item.item_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          {diff && (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${diff.class}`}>
                              {diff.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <span className="text-[13px] text-muted-foreground">{item.serie}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/dashboard/itens/${item.id}`}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Pencil size={14} />
                            </Link>
                            <button
                              onClick={() => handleDelete(item.id, item.stem)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => applyFilters(page - 1)}
                    disabled={page <= 1 || isPending}
                    className="p-2 rounded-lg border border-border hover:border-primary hover:text-primary disabled:opacity-40 transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => applyFilters(page + 1)}
                    disabled={page >= totalPages || isPending}
                    className="p-2 rounded-lg border border-border hover:border-primary hover:text-primary disabled:opacity-40 transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
