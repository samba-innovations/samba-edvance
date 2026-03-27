/**
 * PDF generator — porta 1:1 do samba-simulator/pdf_generator.py
 * ReportLab usa y=0 na BASE da página (y cresce para cima).
 * PDFKit usa y=0 no TOPO da página (y cresce para baixo).
 * Conversão: y_pdf = PAGE_H - y_rl
 */

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { MathSegment, renderMathSegments } from "./math-render";

// ─── Constantes de layout ─────────────────────────────────────────────────────

const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const CM      = 28.3465;

const ML      = 1.2  * CM;   // margem esquerda
const MR      = 0.8  * CM;   // margem direita
const MT      = 1.2  * CM;   // margem superior
const MB      = 1.0  * CM;   // margem inferior
const COL_GAP = 0.35 * CM;   // gap entre colunas
const COL_W   = (PAGE_W - ML - MR - COL_GAP) / 2;  // ~263 pt (antes ~256)
const FOOTER_H = 0.8 * CM;
const HEADER_H = 4.0 * CM;

// Área útil das colunas
const COL_BOT       = PAGE_H - MB - FOOTER_H;
const COL_TOP_FIRST = MT + HEADER_H;
const COL_TOP_OTHER = MT;

// Posições do footer derivadas das constantes (evita hardcode)
const FOOTER_LINE_Y = PAGE_H - MB - FOOTER_H + 0.12 * CM;
const FOOTER_TEXT_Y = PAGE_H - MB - FOOTER_H + FOOTER_H * 0.35;

// ─── Fontes ───────────────────────────────────────────────────────────────────
// Para usar fonte customizada, coloque os arquivos TTF em public/assets/fonts/:
//   SourceSans3-Regular.ttf  SourceSans3-Bold.ttf  SourceSans3-Italic.ttf
// Download gratuito: https://fonts.google.com/specimen/Source+Sans+3
// Sem os arquivos, o sistema usa Helvetica (incorporada no PDFKit).

const FONTS_DIR = path.join(process.cwd(), "public", "assets", "fonts");
function _fontPath(file: string): string | null {
  const p = path.join(FONTS_DIR, file);
  return fs.existsSync(p) ? p : null;
}
const _customNorm = _fontPath("SourceSans3-Regular.ttf");
const _customBold = _fontPath("SourceSans3-Bold.ttf");
const _customObli = _fontPath("SourceSans3-Italic.ttf");
const HAS_CUSTOM_FONT = !!(_customNorm && _customBold && _customObli);

const F_NORM  = HAS_CUSTOM_FONT ? "SS3-Regular" : "Helvetica";
const F_BOLD  = HAS_CUSTOM_FONT ? "SS3-Bold"    : "Helvetica-Bold";
const F_OBLI  = HAS_CUSTOM_FONT ? "SS3-Italic"  : "Helvetica-Oblique";
const F_SIZE  = 10;
const LEADING = 11;   // espaçamento simples (~1.1× @ 10pt)

// ─── Conversão de coordenada ReportLab → PDFKit ───────────────────────────────
// rl(y) converte y medido da BASE para y medido do TOPO
const rl = (y: number) => PAGE_H - y;

// ─── Assets ───────────────────────────────────────────────────────────────────

function asset(name: string): string | null {
  // Tenta cwd (Next.js aponta para raiz do projeto) e também o diretório do arquivo
  const candidates = [
    path.join(process.cwd(), "public", "assets", name),
    path.join(__dirname, "..", "public", "assets", name),
    path.join(__dirname, "../../public/assets", name),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ─── LaTeX → texto legível ────────────────────────────────────────────────────

// ASCII-only map — PDFKit's built-in Helvetica only supports Latin-1.
// Using Unicode symbols (Σ, α, ∫…) would produce garbled output.
const LATEX_MAP: Record<string, string> = {
  "\\alpha":"alpha","\\beta":"beta","\\gamma":"gamma","\\delta":"delta",
  "\\epsilon":"eps","\\zeta":"zeta","\\eta":"eta","\\theta":"theta",
  "\\iota":"iota","\\kappa":"kappa","\\lambda":"lambda","\\mu":"mu",
  "\\nu":"nu","\\xi":"xi","\\pi":"pi","\\rho":"rho","\\sigma":"sigma",
  "\\tau":"tau","\\upsilon":"upsilon","\\phi":"phi","\\chi":"chi",
  "\\psi":"psi","\\omega":"omega","\\Gamma":"Gamma","\\Delta":"Delta",
  "\\Theta":"Theta","\\Lambda":"Lambda","\\Xi":"Xi","\\Pi":"Pi",
  "\\Sigma":"Sigma","\\Upsilon":"Upsilon","\\Phi":"Phi","\\Psi":"Psi",
  "\\Omega":"Omega","\\cdot":"*","\\times":"x","\\div":"/","\\pm":"+-",
  "\\mp":"-+","\\infty":"inf","\\neq":"!=","\\approx":"~=",
  "\\leq":"<=","\\geq":">=","\\rightarrow":"->","\\leftarrow":"<-",
  "\\Rightarrow":"=>","\\partial":"d","\\nabla":"nabla",
  "\\in":"in","\\notin":"not in","\\subset":"c","\\cup":"U","\\cap":"n",
  "\\forall":"forall","\\exists":"exists","\\emptyset":"{}",
  "\\sum":"sum","\\int":"int","\\prod":"prod",
};

function latexToText(expr: string): string {
  let s = expr;
  // \genfrac{}{}{0pt}{}{n}{k} (binomial noBar) → C(n,k)
  s = s.replace(/\\genfrac\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}\{([^}]*)\}\{([^}]*)\}/g, "C($1,$2)");
  // \frac{a}{b} → (a/b)
  s = s.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "($1/$2)");
  // \sqrt[n]{x} → n-rt(x), \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^}]*)\}/g, "$1-rt($2)");
  s = s.replace(/\\sqrt\s*\{([^}]*)\}/g, "sqrt($1)");
  // \sum, \int, \prod with limits
  s = s.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, "sum($1 to $2)");
  s = s.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, "int($1 to $2)");
  s = s.replace(/\\prod_\{([^}]*)\}\^\{([^}]*)\}/g, "prod($1 to $2)");
  // \left/\right delimiters → plain ASCII
  s = s.replace(/\\left\s*\(/g, "(").replace(/\\right\s*\)/g, ")");
  s = s.replace(/\\left\s*\[/g, "[").replace(/\\right\s*\]/g, "]");
  s = s.replace(/\\left\s*\\?\{/g, "{").replace(/\\right\s*\\?\}/g, "}");
  // Substituicoes simbolicas (ASCII-only values)
  for (const [cmd, asc] of Object.entries(LATEX_MAP)) s = s.split(cmd).join(asc);
  // \text{x}, \operatorname{x} → x
  s = s.replace(/\\(?:text|operatorname)\{([^}]*)\}/g, "$1");
  // ^{x} → ^x, _{x} → _x
  s = s.replace(/\^\{([^}]+)\}/g, "^($1)").replace(/_\{([^}]+)\}/g, "_($1)");
  // Remover comandos e chaves restantes
  s = s.replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "");
  return s.trim();
}

/** Replace common non-Latin-1 chars with ASCII equivalents for Helvetica */
function toLatinSafe(s: string): string {
  return s
    .replace(/…/g, "...")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/\u2212/g, "-")   // MINUS SIGN (U+2212)
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/∞/g, "inf")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/≈/g, "~=")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/±/g, "+-")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    // Unicode subscript digits → base digit (e.g. ₄ → 4). Must be before the general fallback.
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, c => String("₀₁₂₃₄₅₆₇₈₉".indexOf(c)))
    // Unicode superscript digits → base digit
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)))
    .replace(/[^\x00-\xFF]/g, "?");  // fallback: any remaining non-Latin-1
}

function processText(text: string): string {
  const withMath = text.replace(/\$\$([^$]+)\$\$|\$([^$\n]+)\$/g, (_, b, i) =>
    latexToText((b ?? i ?? "").trim())
  );
  return toLatinSafe(withMath);
}

// ─── Rendered question (pre-rendered math → PNG buffers) ──────────────────────

interface RenderedOption { label: string; segments: MathSegment[]; images?: string[] }

interface RenderedQuestion {
  number: number;
  stemSegments: MathSegment[];
  optionSegments: RenderedOption[];
  images?: string[];
  correct_label?: string | null;
  /** true se qualquer alternativa tiver imagem — força início de coluna */
  hasOptionImages: boolean;
}

async function preRenderQuestion(q: QuestionData, colWidth: number): Promise<RenderedQuestion> {
  const optionSegments = await Promise.all(
    (q.options || []).map(async opt => ({
      label: opt.label,
      segments: await renderMathSegments(opt.text || "", colWidth * 0.9),
      images: opt.images ?? [],
    }))
  );
  return {
    number: q.number,
    stemSegments: await renderMathSegments(q.stem || "", colWidth),
    optionSegments,
    images: q.images,
    correct_label: q.correct_label,
    hasOptionImages: optionSegments.some(o => (o.images ?? []).length > 0),
  };
}

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface ExamData {
  id: number;
  title: string;
  area: string | null;
  options_count: number;
}

export interface QuestionData {
  number: number;
  stem: string;
  options: Array<{ label: string; text: string; images?: string[] }>;
  correct_label?: string | null;
  images?: string[];
}

export interface StudentInfo {
  name: string;
  ra: string;
  className: string;
}

// ─── Helpers de desenho ───────────────────────────────────────────────────────

type Doc = InstanceType<typeof PDFDocument>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _doc = (doc: Doc) => doc as any;

/** Altura de string respeitando font/fontSize (os tipos do PDFKit não expõem font em TextOptions) */
function strH(doc: Doc, text: string, opts: Record<string, unknown>): number {
  return _doc(doc).heightOfString(text, opts) as number;
}
/** Largura de string com font/size */
function strW(doc: Doc, text: string, opts: Record<string, unknown>): number {
  return _doc(doc).widthOfString(text, opts) as number;
}

/** Linha horizontal */
function hline(doc: Doc, x1: number, x2: number, y: number, w = 0.5) {
  doc.save().lineWidth(w).strokeColor("#000000")
    .moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

/** Cabeçalho institucional — idêntico ao Python _draw_cover + _build_answer_sheet */
function drawInstitutionalHeader(doc: Doc) {
  // Em ReportLab: hdr_top = PAGE_H − 1.2cm, hdr_bot = PAGE_H − 4.0cm
  // Em PDFKit: y_top = 1.2cm, y_bot = 4.0cm
  const yTop = 1.2 * CM;
  const yBot = 4.0 * CM;
  const logoH = yBot - yTop - 0.4 * CM;   // 2.4 cm
  const logoY = yTop + 0.2 * CM;          // 1.4 cm

  hline(doc, ML, PAGE_W - MR, yTop, 0.5);
  hline(doc, ML, PAGE_W - MR, yBot, 0.5);

  // Logo SP
  const spPath = asset("logo_sp.png");
  if (spPath) {
    doc.image(spPath, ML, logoY, { width: 2.0 * CM, height: logoH });
  } else {
    doc.save().rect(ML, logoY, 2.0 * CM, logoH).fillColor("#bbbbbb").fill()
      .font(F_BOLD).fontSize(6).fillColor("#000").text("SÃO PAULO", ML, logoY + logoH * 0.4, { width: 2.0 * CM, align: "center" }).restore();
  }

  // Textos institucionais
  // Em RL: drawString(tx, hdr_bot + 2.3cm, ...) → y_pdf = 4.0cm − 2.3cm = 1.7cm
  const tx = ML + 2.0 * CM + 0.3 * CM;
  const tw = PAGE_W - MR - 2.2 * CM - tx;
  doc.save().fillColor("#000");
  doc.font(F_BOLD).fontSize(7).text(
    "GOVERNO DO ESTADO DE SÃO PAULO – SECRETARIA DE ESTADO DA EDUCAÇÃO",
    tx, yBot - 2.3 * CM, { width: tw, lineBreak: false }
  );
  doc.font(F_NORM).fontSize(7)
    .text("UNIDADE REGIONAL DE ENSINO – REGIÃO BAURU – EE PROF. CHRISTINO CABRAL", tx, yBot - 1.8 * CM, { width: tw, lineBreak: false })
    .text("Rua Gerson França, 19-165 – Jardim Estoril II – CEP: 17016-000", tx, yBot - 1.3 * CM, { width: tw, lineBreak: false })
    .text("Telefones: (14) 3223-3855 (WhatsApp); (14) 3227-4664 – E-mail: e625598a@educacao.sp.gov.br", tx, yBot - 0.8 * CM, { width: tw, lineBreak: false });
  doc.restore();

  // Logo Integral (direita)
  const biX = PAGE_W - MR - 2.2 * CM;
  const intPath = asset("logo_integral.png");
  if (intPath) {
    doc.image(intPath, biX, logoY, { width: 2.0 * CM, height: logoH });
  } else {
    doc.save().roundedRect(biX, logoY, 2.0 * CM, logoH, 3).fillColor("#0073b6").fill()
      .font(F_BOLD).fontSize(6).fillColor("#fff").text("ENSINO INTEGRAL", biX, logoY + logoH * 0.35, { width: 2.0 * CM, align: "center" }).restore();
  }
}

/** Footer com número de página */
function drawFooter(doc: Doc, pageNum: number) {
  hline(doc, ML, PAGE_W - MR, FOOTER_LINE_Y, 0.4);
  const s = String(pageNum);
  const sw = strW(doc, s, { font: F_NORM, size: 9 });
  doc.save().font(F_NORM).fontSize(9).fillColor("#000")
    .text(s, PAGE_W / 2 - sw / 2, FOOTER_TEXT_Y, { lineBreak: false })
    .restore();
}

/** Cabeçalho das páginas de questões */
function drawQuestionsHeader(doc: Doc, exam: ExamData, nQ: number) {
  // RL: ty = PAGE_H − MARGIN_TOP; title at ty − 0.7cm → y_pdf = MT + 0.7cm
  //         area at ty − 1.3cm → y_pdf = MT + 1.3cm
  const today = new Date().toLocaleDateString("pt-BR");
  doc.save().fillColor("#000");
  doc.font(F_BOLD).fontSize(11).text(exam.title || "SIMULADO", ML, MT + 0.7 * CM, { lineBreak: false });
  doc.font(F_NORM).fontSize(10);
  if (exam.area) doc.text(`Área: ${exam.area}`, ML, MT + 1.3 * CM, { lineBreak: false });
  const dtW = strW(doc, `Data: ${today}`, { font: F_NORM, size: 10 });
  const nqW = strW(doc, `Questões: ${nQ}`, { font: F_NORM, size: 10 });
  doc.text(`Data: ${today}`, PAGE_W - MR - dtW, MT + 0.7 * CM, { lineBreak: false });
  doc.text(`Questões: ${nQ}`, PAGE_W - MR - nqW, MT + 1.3 * CM, { lineBreak: false });
  // RL: line at ty − HEADER_H + 0.3cm → y_pdf = MT + HEADER_H − 0.3cm = 5.2cm
  hline(doc, ML, PAGE_W - MR, MT + HEADER_H - 0.3 * CM, 0.6);
  doc.restore();
}

/** Página de rascunho */
function drawDraftPage(doc: Doc) {
  doc.save();
  doc.font(F_BOLD).fontSize(90).fillColor("#e0e0e0");
  // Rotaciona 45° em torno do centro da página
  doc.rotate(45, { origin: [PAGE_W / 2, PAGE_H / 2] });
  const s = "RASCUNHO";
  const sw = strW(doc, s, { font: F_BOLD, size: 90 });
  doc.text(s, PAGE_W / 2 - sw / 2, PAGE_H / 2 - 50, { lineBreak: false });
  doc.restore();
}

// ─── Capa ─────────────────────────────────────────────────────────────────────

function drawCover(
  doc: Doc, exam: ExamData,
  studentName: string, studentRa: string, studentClass: string,
  nQuestions: number
) {
  drawInstitutionalHeader(doc);

  // Título — RL: title_y = hdr_bot − 3.5cm = PAGE_H−4.0cm−3.5cm = PAGE_H−7.5cm → y_pdf = 7.5cm
  const titleY = 7.5 * CM;
  doc.save().font(F_BOLD).fontSize(20).fillColor("#000");
  doc.text((exam.title || "SIMULADO").toUpperCase(), ML, titleY, { width: PAGE_W - ML - MR, align: "center", lineBreak: false });
  // RL: line 0.5cm abaixo da baseline do título de 20pt
  // PDFKit posiciona y no topo do texto; ascent de 20pt ≈ 14pt ≈ 0.5cm → baseline + 0.5cm = top + 1.0cm
  hline(doc, ML + 2 * CM, PAGE_W - MR - 2 * CM, titleY + 1.0 * CM, 1.5);
  doc.restore();

  // Instruções — 0.6cm abaixo da linha do título (linha em titleY+1.0cm → iy = titleY+1.6cm)
  const instructions = [
    "Confira seus dados impressos neste caderno. Cuidado com a folha de respostas, a mesma não será reposta.",
    "Assine com caneta de tinta preta a Folha de Respostas apenas no local indicado.",
    `Esta prova contém ${nQuestions} questões objetivas.`,
    "Quando for permitido abrir o caderno, verifique se está completo ou se apresenta imperfeições. Caso haja algum problema, informe ao professor.",
    "Para cada questão, o candidato deverá assinalar apenas uma alternativa na Folha de Respostas, utilizando caneta de tinta azul ou preta.",
    "Esta prova terá duração total de 2h e 30min e o candidato somente poderá sair se permitido pelo professor aplicador, após 50 min contados a partir do início da prova.",
    "Ao final da prova, entregue ao professor a folha de Respostas obrigatoriamente e o Caderno de Questões se o professor solicitar.",
  ];

  let iy = titleY + 1.6 * CM;
  const maxW = PAGE_W - ML - MR - 0.6 * CM;
  for (const instr of instructions) {
    doc.save();
    doc.font(F_BOLD).fontSize(9.5).fillColor("#000").text("\u2022", ML, iy, { lineBreak: false });
    const instrH = strH(doc, instr, { font: F_NORM, fontSize: 9.5, width: maxW });
    doc.font(F_NORM).fontSize(9.5).text(instr, ML + 0.5 * CM, iy, { width: maxW, align: "justify", lineBreak: true });
    doc.restore();
    iy += instrH + 4;
  }

  // Campos do aluno — RL: fy = 8.5cm da BASE → y_pdf = PAGE_H − 8.5cm
  const today = new Date().toLocaleDateString("pt-BR");
  const boxH = 0.7 * CM;
  const fy = PAGE_H - 8.5 * CM;

  function drawBox(label: string, value: string, bx: number, by: number, bw: number) {
    doc.save();
    const lw = strW(doc, label, { font: F_BOLD, size: 11 }) + 0.25 * CM;
    doc.font(F_BOLD).fontSize(11).fillColor("#000").text(label, bx, by + boxH * 0.2, { lineBreak: false });
    doc.save().roundedRect(bx + lw, by, bw - lw, boxH, 4)
      .fillColor("#f5f5f5").fill()
      .lineWidth(0.5).strokeColor("#666").stroke()
      .restore();
    if (value) {
      doc.font(F_NORM).fontSize(10.5).fillColor("#000")
        .text(value, bx + lw + 0.2 * CM, by + boxH * 0.2, { lineBreak: false });
    }
    doc.restore();
  }

  const fullW = PAGE_W - ML - MR;
  drawBox("Nome:", studentName, ML, fy, fullW);
  const ry = fy + boxH + 0.3 * CM;
  const raW = fullW * 0.38, serW = fullW * 0.25, dtW = fullW * 0.37;
  drawBox("R.A:", studentRa, ML, ry, raW);
  drawBox("Série:", studentClass, ML + raW + 0.2 * CM, ry, serW);
  drawBox("Data:", today, ML + raW + serW + 0.4 * CM, ry, dtW);

  // Rodapé — linha em MB, texto 0.45cm abaixo (RL: MARGIN_BOTTOM − 0.45cm da base)
  hline(doc, ML, PAGE_W - MR, PAGE_H - MB, 0.4);
  doc.save().font(F_OBLI).fontSize(9).fillColor("#000")
    .text("Confidencial até momento da aplicação.", ML, PAGE_H - MB + 0.45 * CM, { lineBreak: false })
    .restore();
}

// ─── Altura de um bloco de questão ────────────────────────────────────────────

/** Resolve image path from public-relative URL or absolute */
function resolveImg(src: string): string | null {
  const p = src.startsWith("/") ? path.join(process.cwd(), "public", src) : src;
  return fs.existsSync(p) ? p : null;
}

/** Registra fontes customizadas no documento (no-op se não houver arquivos) */
function registerFonts(doc: Doc) {
  if (HAS_CUSTOM_FONT) {
    _doc(doc).registerFont("SS3-Regular", _customNorm);
    _doc(doc).registerFont("SS3-Bold",    _customBold);
    _doc(doc).registerFont("SS3-Italic",  _customObli);
  }
}

/**
 * Desenha uma linha de texto com justificação por word-spacing.
 * Linhas finais de parágrafo (isParaEnd=true) ficam alinhadas à esquerda.
 */
function drawJustifiedLine(
  doc: Doc, line: string, x: number, y: number, lineWidth: number, isParaEnd: boolean
) {
  if (isParaEnd || !line.includes(" ")) {
    doc.save().font(F_NORM).fontSize(F_SIZE).fillColor("#000")
      .text(line, x, y, { lineBreak: false });
    doc.restore();
    return;
  }
  const words = line.split(" ").filter(w => w.length > 0);
  if (words.length <= 1) {
    doc.save().font(F_NORM).fontSize(F_SIZE).fillColor("#000")
      .text(line, x, y, { lineBreak: false });
    doc.restore();
    return;
  }
  const totalW = words.reduce((s, w) => s + strW(doc, w, { font: F_NORM, fontSize: F_SIZE }), 0);
  const gap = (lineWidth - totalW) / (words.length - 1);
  // Não justifica se o gap for muito grande (linha muito curta)
  if (gap > 18) {
    doc.save().font(F_NORM).fontSize(F_SIZE).fillColor("#000")
      .text(line, x, y, { lineBreak: false });
    doc.restore();
    return;
  }
  let cx = x;
  for (const word of words) {
    const ww = strW(doc, word, { font: F_NORM, fontSize: F_SIZE });
    doc.save().font(F_NORM).fontSize(F_SIZE).fillColor("#000")
      .text(word, cx, y, { lineBreak: false });
    doc.restore();
    cx += ww + gap;
  }
}

/**
 * Word-wrap `text` into lines, respecting `maxWidth`.
 * Returns `{ text, isParaEnd }` — isParaEnd marks the last line of each paragraph.
 */
type LineEntry = { text: string; isParaEnd: boolean };

function splitIntoLines(
  doc: Doc,
  text: string,
  maxWidth: number,
  firstLineAvail = maxWidth,
): LineEntry[] {
  const lines: LineEntry[] = [];
  const paras = text.split("\n");
  let isFirst = true;
  for (const para of paras) {
    const avail = isFirst ? firstLineAvail : maxWidth;
    const words = para ? para.split(" ") : [""];
    let cur = "";
    let lineAvail = avail;
    for (const word of words) {
      const candidate = cur ? `${cur} ${word}` : word;
      if (strW(doc, candidate, { font: F_NORM, fontSize: F_SIZE }) <= lineAvail) {
        cur = candidate;
      } else if (cur) {
        lines.push({ text: cur, isParaEnd: false });
        cur = word;
        lineAvail = maxWidth;
      } else {
        lines.push({ text: word, isParaEnd: false });
        cur = "";
        lineAvail = maxWidth;
      }
    }
    lines.push({ text: cur, isParaEnd: true }); // última linha do parágrafo
    isFirst = false;
  }
  return lines;
}

function segmentsHeight(doc: Doc, segs: MathSegment[], width: number): number {
  let h = 0;
  let curX = 0;  // offset from left edge
  let rowH = 0;

  const newRow = () => { h += rowH; rowH = 0; curX = 0; };

  for (const seg of segs) {
    if (seg.type === "math" && seg.display) {
      if (rowH > 0) newRow();
      const imgW = Math.min(seg.widthPt, width);
      h += seg.heightPt * (imgW / seg.widthPt) + 6;
    } else if (seg.type === "math") {
      const imgW = Math.min(seg.widthPt, width);
      const imgH = seg.heightPt * (imgW / seg.widthPt) + 2;
      if (curX > 0 && curX + imgW > width) newRow();
      curX += imgW + 1;
      rowH = Math.max(rowH, imgH);
    } else {
      const safe = toLatinSafe(seg.content);
      if (!safe.trim()) continue;
      const avail = width - curX;
      const lines = splitIntoLines(doc, safe, width, avail);
      for (let li = 0; li < lines.length - 1; li++) {
        rowH = Math.max(rowH, LEADING);
        newRow();
      }
      const lastLineW = strW(doc, lines[lines.length - 1].text, { font: F_NORM, fontSize: F_SIZE });
      curX = (lines.length > 1 ? 0 : curX) + lastLineW;
      rowH = Math.max(rowH, LEADING);
    }
  }
  if (rowH > 0) h += rowH;
  return h;
}

// Altura máx de imagem no enunciado: 20% da área útil (~126 pt ≈ 4.4 cm)
const MAX_STEM_IMG_H = (PAGE_H - COL_TOP_FIRST - MB - FOOTER_H) * 0.2;
// Altura máx de imagem em alternativa: 2.0 cm — reduzido para não ocupar coluna inteira
const MAX_OPT_IMG_H  = 2.0 * CM;
const MAX_OPT_IMG_W  = COL_W * 0.60; // até 60% da coluna, centralizado

function questionBlockHeight(doc: Doc, rq: RenderedQuestion): number {
  let h = 0;
  h += strH(doc, `Questão ${rq.number}`, { font: F_BOLD, fontSize: F_SIZE, width: COL_W }) + 1;
  for (const src of rq.images ?? []) {
    if (resolveImg(src)) h += MAX_STEM_IMG_H + 0.15 * CM;
  }
  h += segmentsHeight(doc, rq.stemSegments, COL_W) + 0.08 * CM;
  for (const opt of rq.optionSegments) {
    const lw = strW(doc, `${opt.label}) `, { font: F_NORM, size: F_SIZE });
    h += segmentsHeight(doc, opt.segments, COL_W - lw) + 1;
    const optImgs = (opt.images ?? []).filter(src => resolveImg(src));
    if (optImgs.length > 0) {
      h += 0.15 * CM;
      for (const src of optImgs) {
        if (resolveImg(src)) h += MAX_OPT_IMG_H + 0.20 * CM;
      }
    }
  }
  h += 0.25 * CM;
  return h;
}

// ─── Desenhar segmentos (texto + imagens de math) ─────────────────────────────
// Inline math and text share the same row; display math always gets its own row.

function drawSegments(doc: Doc, segs: MathSegment[], x: number, startY: number, width: number): number {
  let y = startY;
  let curX = x;
  let rowH = 0;

  const newRow = () => { if (rowH > 0) { y += rowH; } rowH = 0; curX = x; };

  for (const seg of segs) {
    if (seg.type === "math" && seg.display) {
      if (rowH > 0) newRow();
      const imgW = Math.min(seg.widthPt, width);
      const imgH = seg.heightPt * (imgW / seg.widthPt);
      doc.image(seg.buffer, x + (width - imgW) / 2, y, { width: imgW, height: imgH });
      y += imgH + 6;
    } else if (seg.type === "math") {
      const imgW = Math.min(seg.widthPt, width);
      const imgH = seg.heightPt * (imgW / seg.widthPt);
      if (curX > x && curX + imgW > x + width) newRow();
      doc.image(seg.buffer, curX, y, { width: imgW, height: imgH });
      curX += imgW + 1;
      rowH = Math.max(rowH, imgH + 2);
    } else {
      const safe = toLatinSafe(seg.content);
      if (!safe.trim()) continue;
      const avail = x + width - curX;
      const lines = splitIntoLines(doc, safe, width, avail);
      for (let li = 0; li < lines.length; li++) {
        const { text: line, isParaEnd } = lines[li];
        const isLast = li === lines.length - 1;
        const lx = li === 0 ? curX : x;
        const lineW = li === 0 ? (x + width - curX) : width;
        if (line) {
          drawJustifiedLine(doc, line, lx, y, lineW, isParaEnd);
        }
        if (!isLast) {
          rowH = Math.max(rowH, LEADING);
          newRow();
        } else {
          curX = lx + strW(doc, line, { font: F_NORM, fontSize: F_SIZE });
          rowH = Math.max(rowH, LEADING);
        }
      }
    }
  }
  if (rowH > 0) y += rowH;
  return y;
}

// ─── Desenhar bloco de questão ────────────────────────────────────────────────

function drawQuestion(doc: Doc, rq: RenderedQuestion, x: number, startY: number): number {
  let y = startY;

  // "Questão N"
  doc.save().font(F_BOLD).fontSize(F_SIZE).fillColor("#000")
    .text(`Questão ${rq.number}`, x, y, { width: COL_W, lineBreak: false });
  y += strH(doc, `Questão ${rq.number}`, { font: F_BOLD, fontSize: F_SIZE, width: COL_W }) + 1;
  doc.restore();

  // Imagens do enunciado (vindas do DOCX ou manual)
  const maxStemW = COL_W * 0.85;
  for (const src of rq.images ?? []) {
    const imgPath = resolveImg(src);
    if (imgPath) {
      try {
        const dim = _doc(doc).openImage(imgPath);
        const scale = Math.min(maxStemW / dim.width, MAX_STEM_IMG_H / dim.height, 1);
        const iw = dim.width * scale, ih = dim.height * scale;
        doc.image(imgPath, x, y, { width: iw, height: ih });
        y += ih + 0.15 * CM;
      } catch { /* ignora */ }
    }
  }

  // Enunciado (text + math images)
  y = drawSegments(doc, rq.stemSegments, x, y, COL_W);
  y += 0.08 * CM;

  // Alternativas
  for (const opt of rq.optionSegments) {
    const label = `${opt.label})`;
    const lw = strW(doc, label + " ", { font: F_NORM, size: F_SIZE });
    const textW = COL_W - lw;
    doc.save().font(F_NORM).fontSize(F_SIZE).fillColor("#000")
      .text(label, x, y, { lineBreak: false });
    doc.restore();
    const optStartY = y;
    y = drawSegments(doc, opt.segments, x + lw, y, textW);
    // Imagens da alternativa — centralizadas na largura total da coluna, abaixo do texto
    const optImgs = (opt.images ?? []).filter(src => resolveImg(src));
    if (optImgs.length > 0) {
      y += 0.15 * CM;
      for (const src of optImgs) {
        const imgPath = resolveImg(src)!;
        try {
          const dim = _doc(doc).openImage(imgPath);
          const scale = Math.min(MAX_OPT_IMG_W / dim.width, MAX_OPT_IMG_H / dim.height, 1);
          const iw = dim.width * scale, ih = dim.height * scale;
          const imgX = x + (COL_W - iw) / 2;
          doc.image(imgPath, imgX, y, { width: iw, height: ih });
          y += ih + 0.20 * CM;
        } catch { /* ignora imagem corrompida */ }
      }
    }
    if (y === optStartY) y += F_SIZE + 2;
    y += 1;
  }

  y += 0.25 * CM;
  return y;
}

// ─── Seção de questões (reutilizada por cada cópia do caderno) ────────────────

function drawQuestionsSection(doc: Doc, exam: ExamData, questions: RenderedQuestion[]): number {
  let pageNum = 0;

  doc.addPage({ size: "A4" });
  pageNum++;
  drawQuestionsHeader(doc, exam, questions.length);
  drawFooter(doc, pageNum);

  const instrText =
    "Leia atentamente cada questão antes de responder. " +
    "Marque apenas uma alternativa por questão na folha de respostas. " +
    "Não é permitido o uso de corretivo ou caneta diferente da azul/preta.";

  const instrW = COL_W * 2 + COL_GAP;
  const instrH = strH(doc, instrText, { font: F_OBLI, fontSize: F_SIZE, width: instrW });
  doc.save().font(F_OBLI).fontSize(F_SIZE).fillColor("#000")
    .text(instrText, ML, COL_TOP_FIRST, { width: instrW, align: "justify" })
    .restore();
  hline(doc, ML, PAGE_W - MR, COL_TOP_FIRST + instrH + 0.2 * CM, 0.4);

  let y1 = COL_TOP_FIRST + instrH + 0.4 * CM;
  let y2 = COL_TOP_FIRST + instrH + 0.4 * CM;
  let col = 0;
  const xL = ML;
  const xR = ML + COL_W + COL_GAP;

  const FULL_COL_H = COL_BOT - COL_TOP_OTHER;

  for (const q of questions) {
    doc.font(F_NORM).fontSize(F_SIZE);
    const bh = questionBlockHeight(doc, q);

    // Se a questão cabe em uma única coluna, tenta encaixar sem quebrar
    const fitsCols = bh <= FULL_COL_H;

    if (fitsCols) {
      const curY = col === 0 ? y1 : y2;
      if (curY + bh > COL_BOT) {
        // Não cabe na coluna atual — tenta coluna direita (com ou sem imagens)
        if (col === 0 && y2 + bh <= COL_BOT) {
          col = 1;
        } else {
          // Nenhuma coluna comporta: nova página
          doc.addPage({ size: "A4" });
          pageNum++;
          drawFooter(doc, pageNum);
          y1 = COL_TOP_OTHER;
          y2 = COL_TOP_OTHER;
          col = 0;
        }
      }
    } else {
      // Questão muito alta (imagens grandes) — sempre coloca na col esquerda de nova página
      doc.addPage({ size: "A4" });
      pageNum++;
      drawFooter(doc, pageNum);
      y1 = COL_TOP_OTHER;
      y2 = COL_TOP_OTHER;
      col = 0;
    }

    const newY = drawQuestion(doc, q, col === 0 ? xL : xR, col === 0 ? y1 : y2);
    if (col === 0) y1 = newY; else y2 = newY;
  }

  // Página de rascunho
  doc.addPage({ size: "A4" });
  pageNum++;
  drawDraftPage(doc);
  drawFooter(doc, pageNum);

  return pageNum;
}

// ─── BUILD BOOKLET ────────────────────────────────────────────────────────────

/**
 * Gera um caderno de questões em PDF.
 * Se `students` for fornecido, gera um caderno completo por aluno (capa personalizada + questões),
 * todos concatenados em um único arquivo.
 */
export async function buildBooklet(
  exam: ExamData,
  questions: QuestionData[],
  students: StudentInfo[] = [],
  opts: { studentName?: string; studentRa?: string; studentClass?: string } = {}
): Promise<Buffer> {
  // Pre-render all math formulas to PNG buffers before building the PDF
  const rendered = await Promise.all(questions.map(q => preRenderQuestion(q, COL_W)));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", autoFirstPage: false, bufferPages: true });
    registerFonts(doc);
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const list: StudentInfo[] = students.length > 0 ? students : [{
      name: opts.studentName ?? "",
      ra: opts.studentRa ?? "",
      className: opts.studentClass ?? "",
    }];

    for (const student of list) {
      doc.addPage({ size: "A4" });
      drawCover(doc, exam, student.name, student.ra, student.className, rendered.length);
      drawQuestionsSection(doc, exam, rendered);
    }

    doc.end();
  });
}

// ─── HELPER: Nomear arquivos PDF ──────────────────────────────────────────────

/**
 * Gera o nome do arquivo PDF conforme as convenções do sistema:
 *
 *  Modo individual (por aluno):
 *    caderno  → Caderno_RA{ra}_Nome{primeiroNome}_{serie}.pdf
 *    resposta → Resposta_RA{ra}_Nome{primeiroNome}_{serie}.pdf
 *
 *  Modo turma (lote):
 *    Caderno_{serie}.pdf
 *
 *  Modo blank (em branco):
 *    Caderno_{serie}_blank.pdf
 *
 * Caracteres inválidos para nome de arquivo são substituídos por "_".
 */
export function getPdfFilename(
  type: "caderno" | "resposta",
  mode: "individual" | "turma" | "blank",
  opts?: { student?: StudentInfo; className?: string }
): string {
  const safe = (s: string) =>
    (s ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // remove acentos
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      || "X";

  if (mode === "individual" && opts?.student) {
    const ra        = safe(opts.student.ra);
    const firstName = safe(opts.student.name.split(" ")[0]);
    const serie     = safe(opts.student.className);
    const prefix    = type === "caderno" ? "Caderno" : "Resposta";
    return `${prefix}_RA${ra}_Nome${firstName}_${serie}.pdf`;
  }

  const serie = safe(opts?.className ?? opts?.student?.className ?? "Turma");

  if (mode === "turma") {
    return `Caderno_${serie}.pdf`;
  }

  // blank
  return `Caderno_${serie}_blank.pdf`;
}


/**
 * Gera folha(s) de respostas em PDF.
 * Se `students` for fornecido, gera uma folha por aluno (uma página cada).
 */
export function buildAnswerSheet(
  exam: ExamData,
  nQuestions: number,
  students: StudentInfo[] = [],
  opts: { studentName?: string; studentRa?: string; studentClass?: string; studentId?: number } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const OPTIONS = ["A", "B", "C", "D", "E"].slice(0, exam.options_count || 5);
    const N_OPTS  = OPTIONS.length;
    const nGridCols = nQuestions <= 30 ? 2 : nQuestions <= 60 ? 3 : 4;
    const rowsPerCol = Math.ceil(nQuestions / nGridCols);

    const list: StudentInfo[] = students.length > 0 ? students : [{
      name: opts.studentName ?? "",
      ra: opts.studentRa ?? "",
      className: opts.studentClass ?? "",
    }];

    for (const student of list) {
    doc.addPage({ size: "A4" });

    // ── Cabeçalho institucional ──────────────────────────────────────────
    drawInstitutionalHeader(doc);

    // ── Título "FOLHA DE RESPOSTAS" ──────────────────────────────────────
    // RL: y = hdr_bot − 0.7cm → y_pdf = 4.7cm
    //     subtítulo em y − 0.4cm → y_pdf = 5.1cm
    //     campos em y − 1.1cm → y_pdf = 5.8cm
    let y = 4.7 * CM;
    doc.save().font(F_BOLD).fontSize(13).fillColor("#000")
      .text("FOLHA DE RESPOSTAS", ML, y, { width: PAGE_W - ML - MR, align: "center", lineBreak: false });
    doc.font(F_NORM).fontSize(9)
      .text((exam.title || "SIMULADO").toUpperCase(), ML, y + 0.4 * CM, { width: PAGE_W - ML - MR, align: "center", lineBreak: false });
    doc.restore();
    y += 1.1 * CM;  // campos começam em 5.8cm

    // ── Campos do aluno ──────────────────────────────────────────────────
    const BOX_H = 0.55 * CM;
    const today = new Date().toLocaleDateString("pt-BR");
    const uw = PAGE_W - ML - MR;

    function field(label: string, value: string, fx: number, fy: number, fw: number) {
      doc.save()
        .roundedRect(fx, fy, fw, BOX_H, 3)
        .lineWidth(0.5).fillColor("#fff").fillAndStroke("#fff", "#444")
        .font(F_BOLD).fontSize(7.5).fillColor("#000")
        .text(`${label}  `, fx + 0.15 * CM, fy + BOX_H * 0.2, { lineBreak: false });
      const lw = strW(doc, `${label}  `, { font: F_BOLD, size: 7.5 });
      doc.font(F_NORM).fontSize(8).fillColor("#000")
        .text(value, fx + 0.15 * CM + lw, fy + BOX_H * 0.2, { lineBreak: false });
      doc.restore();
    }

    field("Nome:", student.name, ML, y, uw);
    y += BOX_H + 0.2 * CM;
    const fw3 = uw / 3 - 0.1 * CM;
    field("R.A:", student.ra, ML, y, fw3);
    field("Série:", student.className, ML + fw3 + 0.15 * CM, y, fw3);
    field("Data:", today, ML + 2 * (fw3 + 0.15 * CM), y, fw3);
    y += BOX_H + 0.5 * CM;

    // ── Instruções ───────────────────────────────────────────────────────
    doc.save().font(F_NORM).fontSize(7.5).fillColor("#000");
    for (const inst of [
      "\u2022Marque apenas UMA alternativa por questão com caneta azul ou preta.",
      "\u2022Preencha completamente o círculo.  Marcações rasuradas anulam a questão.",
      "\u2022Não amasse, rasgue ou escreva fora dos lugares indicados.",
    ]) {
      doc.text(inst, ML, y, { width: uw, lineBreak: false });
      y += 0.38 * CM;
    }
    doc.restore();
    y += 0.3 * CM;

    // ── Grid de questões ─────────────────────────────────────────────────
    const CR     = 0.21 * CM;   // raio do círculo
    const ROW_H  = 0.62 * CM;
    const NUM_W  = 0.75 * CM;
    const OPT_W  = 0.88 * CM;
    const COL_WG = NUM_W + N_OPTS * OPT_W + 0.5 * CM;
    const GAP    = (uw - nGridCols * COL_WG) / (nGridCols + 1);
    const GRID_H = rowsPerCol * ROW_H + ROW_H;
    const GRID_PAD = 0.25 * CM;

    // Fundo rounded do grid
    doc.save()
      .roundedRect(ML - GRID_PAD, y - GRID_PAD, uw + 2 * GRID_PAD, GRID_H + 2 * GRID_PAD, 6)
      .lineWidth(0.6).fillColor("#f7f7f7").fillAndStroke("#f7f7f7", "#888")
      .restore();

    // Cabeçalho: "Nº  A  B  C  D  E"
    const yHdr = y + ROW_H * 0.35;
    doc.save().font(F_BOLD).fontSize(8).fillColor("#000");
    for (let gc = 0; gc < nGridCols; gc++) {
      const colX = ML + GAP + gc * (COL_WG + GAP);
      doc.text("Nº", colX, yHdr, { width: NUM_W, align: "center", lineBreak: false });
      for (let oi = 0; oi < N_OPTS; oi++) {
        doc.text(OPTIONS[oi], colX + NUM_W + oi * OPT_W + OPT_W * 0.25, yHdr, {
          width: OPT_W * 0.5, align: "center", lineBreak: false,
        });
      }
    }
    doc.restore();

    // Linhas de questões
    for (let row = 0; row < rowsPerCol; row++) {
      const rowY   = y + (row + 1) * ROW_H;
      const midY   = rowY + ROW_H * 0.52;
      const fill   = row % 2 === 0 ? "#ffffff" : "#e8e8e8";

      for (let gc = 0; gc < nGridCols; gc++) {
        const qNum = row + gc * rowsPerCol + 1;
        if (qNum > nQuestions) continue;
        const colX = ML + GAP + gc * (COL_WG + GAP);

        // Fundo da linha
        doc.save().rect(colX - GAP / 2, rowY, COL_WG + GAP / 2, ROW_H).fillColor(fill).fill().restore();

        // Número da questão
        const qStr = qNum.toString().padStart(2, "0");
        doc.save().font(F_BOLD).fontSize(8).fillColor("#000")
          .text(qStr, colX, midY - 0.15 * CM, { width: NUM_W - 0.1 * CM, align: "right", lineBreak: false })
          .restore();

        // Círculos das alternativas
        for (let oi = 0; oi < N_OPTS; oi++) {
          const cx = colX + NUM_W + oi * OPT_W + OPT_W / 2;
          doc.save()
            .lineWidth(0.7).strokeColor("#333").fillColor("#fff")
            .circle(cx, midY, CR).fillAndStroke()
            .font(F_NORM).fontSize(6).fillColor("#333")
            .text(OPTIONS[oi], cx - CR, midY - CR * 0.6, { width: CR * 2, align: "center", lineBreak: false })
            .restore();
        }
      }
    }

    // Borda do grid por cima
    doc.save()
      .roundedRect(ML - GRID_PAD, y - GRID_PAD, uw + 2 * GRID_PAD, GRID_H + 2 * GRID_PAD, 6)
      .lineWidth(0.6).strokeColor("#888").stroke()
      .restore();

    // Identificação / barcode texto
    const barY = y + GRID_H + GRID_PAD + 0.5 * CM;
    const barCode = `SAMBA-E${exam.id}-RA${student.ra || "0"}`;
    doc.save().font(F_NORM).fontSize(7.5).fillColor("#333")
      .text(barCode, ML, barY, { width: uw, align: "center", lineBreak: false });
    doc.font(F_NORM).fontSize(6.5).fillColor("#888")
      .text("Sistema de Avaliação SAMBA — Folha de Respostas", ML, barY + 0.5 * CM, { width: uw, align: "center", lineBreak: false });
    doc.restore();
    } // fim do loop de alunos

    doc.end();
  });
}
