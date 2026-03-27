"use client";

/**
 * LatexEditor — painel visual de montagem de equações LaTeX
 *
 * Uso:
 *   <LatexEditor value={latex} onChange={setLatex} onInsert={(v) => appendToField(v)} />
 *
 * Props:
 *   value     – string LaTeX atual (controlado pelo pai)
 *   onChange  – callback (newValue: string) => void
 *   onInsert  – chamado com o delimitador completo: "$...$" ou "$$...$$"
 *   label     – rótulo opcional (padrão: "Equação")
 *   inline    – se true, delimitador $...$ ; se false, $$...$$ (padrão: true)
 *   onModeChange – callback (inline: boolean) => void
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ButtonDef {
  label: string;
  insert: string;   // | marca posição do cursor / seleção
  title: string;
}

interface Category {
  id: string;
  name: string;
  buttons: ButtonDef[];
}

// ─── Categorias ───────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "basic",
    name: "Operações",
    buttons: [
      { label: "×",   insert: "\\times ",      title: "Multiplicação (×)" },
      { label: "÷",   insert: "\\div ",         title: "Divisão (÷)" },
      { label: "±",   insert: "\\pm ",          title: "Mais ou menos (±)" },
      { label: "∓",   insert: "\\mp ",          title: "Menos ou mais" },
      { label: "=",   insert: "= ",             title: "Igual" },
      { label: "≠",   insert: "\\neq ",         title: "Diferente (≠)" },
      { label: "≈",   insert: "\\approx ",      title: "Aproximado (≈)" },
      { label: "≡",   insert: "\\equiv ",       title: "Equivalente (≡)" },
      { label: "≤",   insert: "\\leq ",         title: "Menor ou igual (≤)" },
      { label: "≥",   insert: "\\geq ",         title: "Maior ou igual (≥)" },
      { label: "·",   insert: "\\cdot ",        title: "Ponto de multiplicação" },
      { label: "∝",   insert: "\\propto ",      title: "Proporcional a" },
    ],
  },
  {
    id: "fractions",
    name: "Frações & Raízes",
    buttons: [
      { label: "a/b",   insert: "\\frac{|a|}{b}",              title: "Fração a/b" },
      { label: "√x",    insert: "\\sqrt{|x|}",                 title: "Raiz quadrada" },
      { label: "ⁿ√x",   insert: "\\sqrt[n]{|x|}",              title: "Raiz n-ésima" },
      { label: "xⁿ",    insert: "{|x|}^{n}",                   title: "Potência xⁿ" },
      { label: "xₙ",    insert: "{|x|}_{n}",                   title: "Subscrito xₙ" },
      { label: "xₙᵐ",   insert: "{|x|}_{n}^{m}",              title: "Sub + sobrescrito" },
      { label: "( )",   insert: "\\left( |expr| \\right)",     title: "Parênteses automáticos" },
      { label: "[ ]",   insert: "\\left[ |expr| \\right]",     title: "Colchetes automáticos" },
      { label: "| |",   insert: "\\left| |expr| \\right|",     title: "Módulo / valor absoluto" },
      { label: "‖ ‖",   insert: "\\left\\| |expr| \\right\\|", title: "Norma" },
    ],
  },
  {
    id: "calculus",
    name: "Cálculo",
    buttons: [
      { label: "∑",    insert: "\\sum_{i=1}^{|n|}",               title: "Somatório" },
      { label: "∏",    insert: "\\prod_{i=1}^{|n|}",              title: "Produtório" },
      { label: "∫",    insert: "\\int_{|a|}^{b}",                 title: "Integral definida" },
      { label: "∫∫",   insert: "\\iint_{|D|}",                    title: "Integral dupla" },
      { label: "∮",    insert: "\\oint_{|C|}",                    title: "Integral de linha" },
      { label: "lim",  insert: "\\lim_{x \\to |a|}",             title: "Limite" },
      { label: "d/dx", insert: "\\frac{d}{dx}\\left(|f(x)|\\right)", title: "Derivada" },
      { label: "∂/∂x", insert: "\\frac{\\partial |f|}{\\partial x}", title: "Derivada parcial" },
      { label: "∞",    insert: "\\infty",                         title: "Infinito" },
      { label: "→",    insert: "\\to ",                           title: "Tende a" },
    ],
  },
  {
    id: "greek",
    name: "Letras Gregas",
    buttons: [
      { label: "α",  insert: "\\alpha ",   title: "Alpha (α)" },
      { label: "β",  insert: "\\beta ",    title: "Beta (β)" },
      { label: "γ",  insert: "\\gamma ",   title: "Gamma (γ)" },
      { label: "δ",  insert: "\\delta ",   title: "Delta (δ)" },
      { label: "ε",  insert: "\\epsilon ", title: "Épsilon (ε)" },
      { label: "ζ",  insert: "\\zeta ",    title: "Zeta (ζ)" },
      { label: "θ",  insert: "\\theta ",   title: "Theta (θ)" },
      { label: "κ",  insert: "\\kappa ",   title: "Kappa (κ)" },
      { label: "λ",  insert: "\\lambda ",  title: "Lambda (λ)" },
      { label: "μ",  insert: "\\mu ",      title: "Mu (μ)" },
      { label: "ν",  insert: "\\nu ",      title: "Nu (ν)" },
      { label: "π",  insert: "\\pi ",      title: "Pi (π)" },
      { label: "ρ",  insert: "\\rho ",     title: "Rho (ρ)" },
      { label: "σ",  insert: "\\sigma ",   title: "Sigma (σ)" },
      { label: "τ",  insert: "\\tau ",     title: "Tau (τ)" },
      { label: "φ",  insert: "\\phi ",     title: "Phi (φ)" },
      { label: "χ",  insert: "\\chi ",     title: "Chi (χ)" },
      { label: "ψ",  insert: "\\psi ",     title: "Psi (ψ)" },
      { label: "ω",  insert: "\\omega ",   title: "Ômega (ω)" },
      { label: "Δ",  insert: "\\Delta ",   title: "Delta (Δ)" },
      { label: "Γ",  insert: "\\Gamma ",   title: "Gamma (Γ)" },
      { label: "Σ",  insert: "\\Sigma ",   title: "Sigma (Σ)" },
      { label: "Ω",  insert: "\\Omega ",   title: "Ômega (Ω)" },
      { label: "Π",  insert: "\\Pi ",      title: "Pi (Π)" },
    ],
  },
  {
    id: "chemistry",
    name: "Química",
    buttons: [
      { label: "→",   insert: "\\rightarrow ",          title: "Reação direta" },
      { label: "⇌",   insert: "\\rightleftharpoons ",   title: "Equilíbrio químico" },
      { label: "↑",   insert: "\\uparrow ",             title: "Gás liberado (↑)" },
      { label: "↓",   insert: "\\downarrow ",           title: "Precipitado (↓)" },
      { label: "°C",  insert: "^{\\circ}\\text{C}",    title: "Graus Celsius" },
      { label: "°K",  insert: "\\text{ K}",             title: "Kelvin" },
      { label: "mol", insert: "\\text{ mol}",           title: "Mol" },
      { label: "M",   insert: "\\text{ mol/L}",         title: "Molaridade (mol/L)" },
      { label: "⁻",   insert: "^{-|n|}",               title: "Carga negativa" },
      { label: "⁺",   insert: "^{+|n|}",               title: "Carga positiva" },
    ],
  },
  {
    id: "trig",
    name: "Trigonometria & Log",
    buttons: [
      { label: "sin",    insert: "\\sin\\left(|x|\\right)",       title: "Seno" },
      { label: "cos",    insert: "\\cos\\left(|x|\\right)",       title: "Cosseno" },
      { label: "tan",    insert: "\\tan\\left(|x|\\right)",       title: "Tangente" },
      { label: "sin⁻¹",  insert: "\\sin^{-1}\\left(|x|\\right)", title: "Arco-seno" },
      { label: "cos⁻¹",  insert: "\\cos^{-1}\\left(|x|\\right)", title: "Arco-cosseno" },
      { label: "tan⁻¹",  insert: "\\tan^{-1}\\left(|x|\\right)", title: "Arco-tangente" },
      { label: "log",    insert: "\\log\\left(|x|\\right)",       title: "Logaritmo base 10" },
      { label: "ln",     insert: "\\ln\\left(|x|\\right)",        title: "Logaritmo natural" },
      { label: "logₐ",   insert: "\\log_{|a|}\\left(x\\right)",   title: "Logaritmo base a" },
      { label: "eˣ",     insert: "e^{|x|}",                      title: "Exponencial natural" },
    ],
  },
  {
    id: "sets",
    name: "Conjuntos & Lógica",
    buttons: [
      { label: "∈",  insert: "\\in ",       title: "Pertence a (∈)" },
      { label: "∉",  insert: "\\notin ",    title: "Não pertence (∉)" },
      { label: "⊂",  insert: "\\subset ",   title: "Contido em (⊂)" },
      { label: "⊆",  insert: "\\subseteq ", title: "Contido ou igual (⊆)" },
      { label: "∪",  insert: "\\cup ",      title: "União (∪)" },
      { label: "∩",  insert: "\\cap ",      title: "Interseção (∩)" },
      { label: "∅",  insert: "\\emptyset ", title: "Conjunto vazio (∅)" },
      { label: "∀",  insert: "\\forall ",   title: "Para todo (∀)" },
      { label: "∃",  insert: "\\exists ",   title: "Existe (∃)" },
      { label: "¬",  insert: "\\neg ",      title: "Negação" },
      { label: "∧",  insert: "\\land ",     title: "E lógico (∧)" },
      { label: "∨",  insert: "\\lor ",      title: "Ou lógico (∨)" },
    ],
  },
  {
    id: "vectors",
    name: "Vetores & Matrizes",
    buttons: [
      { label: "→v",  insert: "\\vec{|v|}",                                           title: "Vetor" },
      { label: "|v|", insert: "|\\vec{|v|}|",                                         title: "Módulo do vetor" },
      { label: "·",   insert: "\\vec{u} \\cdot \\vec{|v|}",                           title: "Produto escalar" },
      { label: "×",   insert: "\\vec{u} \\times \\vec{|v|}",                          title: "Produto vetorial" },
      { label: "2×2", insert: "\\begin{pmatrix} |a| & b \\\\ c & d \\end{pmatrix}",   title: "Matriz 2×2" },
      { label: "det", insert: "\\begin{vmatrix} |a| & b \\\\ c & d \\end{vmatrix}",   title: "Determinante 2×2" },
      { label: "hat", insert: "\\hat{|u|}",                                           title: "Verstor unitário" },
    ],
  },
];

// ─── Exemplos rápidos ─────────────────────────────────────────────────────────

const QUICK_EXAMPLES = [
  { label: "Bhaskara",    latex: "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}" },
  { label: "Pitágoras",   latex: "a^{2} + b^{2} = c^{2}" },
  { label: "Euler",       latex: "e^{i\\pi} + 1 = 0" },
  { label: "Gás ideal",   latex: "PV = nRT" },
  { label: "Newton",      latex: "F = m \\cdot a" },
  { label: "Mol",         latex: "n = \\frac{m}{M}" },
  { label: "pH",          latex: "\\text{pH} = -\\log[H^{+}]" },
  { label: "Exponencial", latex: "f(x) = A \\cdot e^{\\lambda x}" },
];

// ─── Preview MathJax ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (nodes: HTMLElement[]) => Promise<void>;
      startup?: { promise: Promise<void> };
    };
  }
}

function MathPreview({ latex, inline }: { latex: string; inline: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const src = latex.trim() || "\\text{(prévia da equação)}";
    node.innerHTML = inline ? `\\(${src}\\)` : `\\[${src}\\]`;

    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([node]).catch(() => {});
    }
  }, [latex, inline]);

  return (
    <div
      ref={ref}
      style={{
        fontSize: 20,
        color: "var(--color-text-primary)",
        padding: "14px 16px",
        minHeight: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowX: "auto",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-tertiary)",
      }}
    />
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface LatexEditorProps {
  value: string;
  onChange: (v: string) => void;
  onInsert?: (latexWithDelimiters: string) => void;
  onModeChange?: (inline: boolean) => void;
  label?: string;
  inline?: boolean;
}

export default function LatexEditor({
  value,
  onChange,
  onInsert,
  onModeChange,
  label = "Equação",
  inline = true,
}: LatexEditorProps) {
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Inserção inteligente no cursor ────────────────────────────────────────
  const insertAtCursor = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) {
        // fallback: appenda ao final
        onChange(value + snippet.replace(/\|([^|]+)\|/g, "$1"));
        return;
      }
      const start = ta.selectionStart ?? value.length;
      const end   = ta.selectionEnd   ?? value.length;
      const sel   = value.slice(start, end);

      const PHRE = /\|([^|]+)\|/;
      let toInsert = snippet;
      let cursorPos = start;

      if (PHRE.test(snippet)) {
        if (sel) {
          toInsert = snippet.replace(PHRE, sel);
          cursorPos = start + toInsert.length;
        } else {
          const m = snippet.match(PHRE)!;
          const phStart = snippet.indexOf(m[0]);
          toInsert = snippet.replace(PHRE, m[1]);
          cursorPos = start + phStart + m[1].length;
        }
      } else {
        cursorPos = start + toInsert.length;
      }

      const newVal = value.slice(0, start) + toInsert + value.slice(end);
      onChange(newVal);

      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange]
  );

  const currentCat = CATEGORIES.find(c => c.id === activeCat) ?? CATEGORIES[0];
  const delim      = inline ? "$" : "$$";
  const fullLatex  = value.trim() ? `${delim}${value.trim()}${delim}` : "";

  return (
    <div style={{ fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
          {label}
        </span>
        <label style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={!inline}
            onChange={e => onModeChange?.(!e.target.checked)}
          />
          Centralizado (display)
        </label>
      </div>

      {/* Preview */}
      <MathPreview latex={value} inline={inline} />

      {/* Abas */}
      <div style={{
        display: "flex", gap: 4, flexWrap: "wrap",
        borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8,
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            style={{
              fontSize: 12, padding: "3px 9px",
              border: "0.5px solid",
              borderColor: activeCat === cat.id ? "var(--color-border-primary)" : "var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: activeCat === cat.id ? "var(--color-background-secondary)" : "transparent",
              color: activeCat === cat.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              cursor: "pointer",
              fontWeight: activeCat === cat.id ? 500 : 400,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grade de botões */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
        gap: 5,
      }}>
        {currentCat.buttons.map((btn, i) => (
          <button
            key={i}
            title={btn.title}
            onClick={() => insertAtCursor(btn.insert)}
            style={{
              padding: "7px 3px",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              textAlign: "center",
              minHeight: 38,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-background-secondary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-background-primary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-tertiary)";
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Exemplos rápidos */}
      <div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 5px" }}>
          Exemplos rápidos:
        </p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {QUICK_EXAMPLES.map(ex => (
            <button
              key={ex.label}
              title={ex.latex}
              onClick={() => onChange(ex.latex)}
              style={{
                fontSize: 11, padding: "3px 9px",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 20,
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
          Código LaTeX:
        </p>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          rows={3}
          placeholder="Digite ou clique nos botões acima..."
          style={{
            width: "100%", boxSizing: "border-box",
            fontFamily: "var(--font-mono)", fontSize: 13,
            padding: "9px 12px",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)",
            resize: "vertical", outline: "none", lineHeight: 1.6,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = "var(--color-border-primary)";
            e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-border-tertiary)";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "var(--color-border-tertiary)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Rodapé: código gerado + botão inserir */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code style={{
          flex: 1, fontSize: 11, fontFamily: "var(--font-mono)",
          color: "var(--color-text-secondary)",
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: "5px 10px",
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          display: "block",
        }}>
          {fullLatex || `${delim}${delim}`}
        </code>
        {onInsert && (
          <button
            disabled={!value.trim()}
            onClick={() => value.trim() && onInsert(fullLatex)}
            style={{
              padding: "7px 16px", fontSize: 13, fontWeight: 500,
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              background: value.trim() ? "var(--color-background-secondary)" : "transparent",
              color: value.trim() ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              cursor: value.trim() ? "pointer" : "not-allowed",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            Inserir ↗
          </button>
        )}
      </div>
    </div>
  );
}
