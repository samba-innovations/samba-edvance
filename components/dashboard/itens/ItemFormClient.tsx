"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";

type Disciplina = { id: number; name: string };
type Skill = { id: number; code: string; description: string; discipline_id: number };

interface ItemData {
  id?: number;
  stem?: string;
  difficulty?: string;
  item_type?: string;
  serie?: string;
  latex?: boolean;
  options_json?: string | null;
  numeric_answer?: string | null;
  discipline_id?: number;
  skill_id?: number | null;
}

interface Props {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  disciplinas: Disciplina[];
  skills: Skill[];
  initialData?: ItemData;
  mode: "create" | "edit";
}

type Option = { letter: string; text: string };

const SERIES = ["1º EF", "2º EF", "3º EF", "4º EF", "5º EF", "6º EF", "7º EF", "8º EF", "9º EF", "1º EM", "2º EM", "3º EM"];

export function ItemFormClient({ action, disciplinas, skills, initialData, mode }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, null);

  const [disciplineId, setDisciplineId] = useState(String(initialData?.discipline_id ?? ""));
  const [itemType, setItemType] = useState(initialData?.item_type ?? "MULTIPLE_CHOICE");
  const [options, setOptions] = useState<Option[]>(() => {
    if (initialData?.options_json) {
      try { return JSON.parse(initialData.options_json); } catch { /* ignore */ }
    }
    return [
      { letter: "A", text: "" },
      { letter: "B", text: "" },
      { letter: "C", text: "" },
      { letter: "D", text: "" },
    ];
  });

  const filteredSkills = skills.filter((s) => String(s.discipline_id) === disciplineId);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      if (mode === "create") router.push("/dashboard/itens");
    }
    if (state?.error) toast.error(state.error);
  }, [state, mode, router]);

  function updateOption(idx: number, text: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text } : o)));
  }

  function addOption() {
    if (options.length >= 5) return;
    const letters = ["A", "B", "C", "D", "E"];
    setOptions((prev) => [...prev, { letter: letters[prev.length], text: "" }]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = "w-full h-10 px-3.5 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm text-foreground";
  const selectCls = inputCls + " appearance-none";

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {mode === "create" ? "Novo Item" : "Editar Item"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === "create" ? "Adicionar ao banco de itens" : "Atualizar dados do item"}
          </p>
        </div>
      </div>

      <form action={(formData) => {
        if (itemType === "MULTIPLE_CHOICE") {
          formData.set("options_json", JSON.stringify(options));
        }
        formAction(formData);
      }} className="space-y-6">

        {/* Enunciado */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Enunciado</h2>

          <Field label="Texto da questão" required>
            <textarea
              name="stem"
              defaultValue={initialData?.stem}
              rows={5}
              required
              placeholder="Digite o enunciado completo da questão..."
              className="w-full px-3.5 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm text-foreground resize-none"
            />
          </Field>
        </div>

        {/* Configurações */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-5">
          <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Configurações</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Disciplina" required>
              <select
                name="discipline_id"
                value={disciplineId}
                onChange={(e) => setDisciplineId(e.target.value)}
                required
                className={selectCls}
              >
                <option value="">Selecione...</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Habilidade (opcional)">
              <select
                name="skill_id"
                defaultValue={String(initialData?.skill_id ?? "")}
                disabled={!disciplineId}
                className={selectCls + " disabled:opacity-50 disabled:cursor-not-allowed"}
              >
                <option value="">Nenhuma</option>
                {filteredSkills.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.description.slice(0, 50)}</option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de questão" required>
              <select
                name="item_type"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                required
                className={selectCls}
              >
                <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                <option value="DISCURSIVE">Discursiva</option>
                <option value="NUMERIC">Numérica</option>
              </select>
            </Field>

            <Field label="Dificuldade" required>
              <select name="difficulty" defaultValue={initialData?.difficulty ?? "MEDIUM"} required className={selectCls}>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Médio</option>
                <option value="HARD">Difícil</option>
              </select>
            </Field>

            <Field label="Série / Ano" required>
              <select name="serie" defaultValue={initialData?.serie ?? ""} required className={selectCls}>
                <option value="">Selecione...</option>
                {SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Suporte LaTeX">
              <select name="latex" defaultValue={String(initialData?.latex ?? false)} className={selectCls}>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Alternativas (múltipla escolha) */}
        {itemType === "MULTIPLE_CHOICE" && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Alternativas</h2>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={opt.letter} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                    {opt.letter}
                  </span>
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Alternativa ${opt.letter}`}
                    className={inputCls + " flex-1"}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(idx)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 5 && (
              <button type="button" onClick={addOption} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline mt-2">
                <Plus size={14} /> Adicionar alternativa
              </button>
            )}
          </div>
        )}

        {/* Resposta numérica */}
        {itemType === "NUMERIC" && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
            <h2 className="font-black text-foreground text-sm uppercase tracking-wider">Resposta</h2>
            <Field label="Valor esperado">
              <input
                name="numeric_answer"
                type="text"
                defaultValue={initialData?.numeric_answer ?? ""}
                placeholder="Ex: 42 ou 3.14"
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-11 px-6 rounded-xl border border-border text-sm font-bold hover:bg-muted/50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-11 px-6 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {mode === "create" ? "Criar Item" : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
