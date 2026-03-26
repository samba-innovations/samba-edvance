/**
 * Server-side LaTeX → PNG rendering via MathJax (SVG) + sharp.
 * Used by the PDF generator to embed properly rendered math formulas.
 *
 * Important: MathJax document instances accumulate state, so we create a fresh
 * one for each formula to avoid stale cached output.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mathjax }             = require("mathjax-full/js/mathjax.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TeX }                 = require("mathjax-full/js/input/tex.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SVG }                 = require("mathjax-full/js/output/svg.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { liteAdaptor }         = require("mathjax-full/js/adaptors/liteAdaptor.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp                   = require("sharp");

// Register the HTML handler exactly once at module load.
const _adaptor = liteAdaptor();
RegisterHTMLHandler(_adaptor);

/** Create a fresh MathJax document to avoid stale state across conversions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function newMjDoc(): any {
  return mathjax.document("", {
    InputJax: new TeX({ packages: ["base", "ams", "boldsymbol"] }),
    OutputJax: new SVG({ fontCache: "none" }),
  });
}

// ─── Rewrite noBar fraction to \binom (MathJax renders it correctly) ──────────
// \genfrac{}{}{0pt}{}{n}{k} renders too short in MathJax; use \binom instead.
// The surrounding \left(\right) from m:d will add outer parens → \left(\binom{n}{k}\right),
// which is correct (binom itself does NOT add delimiters when used with \genfrac-style here).
// We strip the redundant \left(\right) wrapping when the body is already a \binom.
function normaliseLatex(latex: string): string {
  let s = latex;
  // Decode HTML entities that may have leaked through from OMML XML parsing
  s = s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  // Unicode characters that LaTeX doesn't accept directly
  s = s.replace(/\u2026/g, "\\ldots").replace(/\u22EF/g, "\\cdots");
  // Replace \genfrac{}{}{0pt}{}{A}{B} → \binom{A}{B}
  s = s.replace(
    /\\genfrac\{\}\{\}\{0pt\}\{\}\{([^}]*)\}\{([^}]*)\}/g,
    "\\binom{$1}{$2}"
  );
  // \left(\binom{...}{...}\right) → \binom{...}{...}  (avoid double parens)
  s = s.replace(/\\left\(\\binom(\{[^}]*\})(\{[^}]*\})\\right\)/g, "\\binom$1$2");
  return s;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type MathSegment =
  | { type: "text";  content: string }
  | { type: "math";  display: boolean; buffer: Buffer; widthPt: number; heightPt: number };

// ─── Core renderer ────────────────────────────────────────────────────────────

/**
 * Render a LaTeX expression to a PNG buffer.
 * Returns null on error (caller falls back to ASCII text).
 */
export async function latexToPng(
  latex: string,
  display: boolean,
  maxWidthPt = 256,
): Promise<{ buffer: Buffer; widthPt: number; heightPt: number } | null> {
  try {
    const clean = normaliseLatex(latex);
    // Fresh document every time to avoid MathJax caching between formulas.
    const doc  = newMjDoc();
    const node = doc.convert(clean, { display });
    const html: string = _adaptor.outerHTML(node);

    const svgMatch = html.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) return null;
    let svg = svgMatch[0];

    // viewBox format: "min-x min-y width height" (units = 1/1000 em)
    const vbMatch = svg.match(/viewBox="([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)"/);
    if (!vbMatch) return null;

    const vbW = parseFloat(vbMatch[3]);
    const vbH = parseFloat(vbMatch[4]);
    // 1000 MathJax units ≈ 1em ≈ 10pt → 1 unit = 0.01pt
    const rawWidthPt  = vbW * 0.01;
    const rawHeightPt = vbH * 0.01;

    // Scale to fit column; display formulas may upscale up to 20%
    const scaleFactor = display
      ? Math.min(maxWidthPt / rawWidthPt, 1.2)
      : Math.min((maxWidthPt * 0.55) / rawWidthPt, 1.0);
    const widthPt  = rawWidthPt  * scaleFactor;
    const heightPt = rawHeightPt * scaleFactor;

    // Render at 3× for smooth anti-aliasing
    const pxW = Math.max(Math.ceil(widthPt  * 3), 10);
    const pxH = Math.max(Math.ceil(heightPt * 3), 10);

    svg = svg.replace(/width="[\d.]+ex"/, `width="${pxW}"`);
    svg = svg.replace(/height="[\d.]+ex"/, `height="${pxH}"`);
    // Merge white background into existing style attribute
    svg = svg.replace(/style="([^"]*)"/, `style="$1; background: white;"`);

    // ── Sanitise SVG for librsvg (used by sharp) ──────────────────────────
    // 1. Strip all data-* attributes (non-standard XML)
    svg = svg.replace(/\s+data-[a-zA-Z0-9_-]+="[^"]*"/g, "");
    // 2. Remove ALL <text> elements — MathJax renders glyphs as <path> elements;
    //    the <text> nodes are empty placeholders that may contain invalid control chars.
    svg = svg.replace(/<text[^>]*>[\s\S]*?<\/text>/g, "");
    // 3. Strip XML-invalid C0 control characters
    // eslint-disable-next-line no-control-regex
    svg = svg.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    // 4. Ensure explicit SVG namespace
    if (!svg.includes('xmlns=')) {
      svg = svg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Flatten alpha → white so PDFKit embeds an opaque PNG (transparent PNGs
    // appear black in some PDF viewers / PDFKit rendering paths).
    const buffer: Buffer = await (
      sharp as (input: Buffer) => {
        flatten: (opts: object) => { png: () => { toBuffer: () => Promise<Buffer> } }
      }
    )(Buffer.from(svg))
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    return { buffer, widthPt, heightPt };
  } catch (err) {
    console.error("[math-render] latexToPng error:", err);
    return null;
  }
}

// ─── Text segmenter ───────────────────────────────────────────────────────────

/**
 * Inline formulas that contain display-class constructs (\frac, \sum, \int, etc.)
 * should be rendered in display mode so fractions and large operators are legible.
 */
function needsDisplayMode(latex: string): boolean {
  return /\\frac|\\dfrac|\\sum|\\prod|\\int|\\lim|\\binom|\\genfrac/.test(latex);
}

// ─── Unicode subscript / superscript → LaTeX (mirrors docx-parser logic) ──────
// Handles existing DB rows that already contain Unicode subscript chars.

const _SUB: Record<string,string> = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
const _SUP: Record<string,string> = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-'};

// Matches plain-text caret/underscore notation: base^exp or base_sub
// Only applied to plain-text chunks (outside existing $...$ delimiters).
const _CARET_RE = /([A-Za-z0-9]+)\^(\{[^}]*\}|[A-Za-z0-9]+)/g;
// Underscores: only convert when the subscript is purely numeric (e.g. x_0, H_2)
const _UNDER_RE = /([A-Za-z0-9]+)_(\{[0-9]+\}|[0-9]+)/g;

/** Apply caret/underscore + Unicode-script conversion to one plain-text chunk. */
function _convertPlainChunk(chunk: string): string {
  const isSub = (c: string) => c in _SUB;
  const isSup = (c: string) => c in _SUP;
  const isFC  = (c: string) => /[A-Za-z0-9]/.test(c);

  // Caret / underscore → $...$
  _CARET_RE.lastIndex = 0;
  let t = chunk.replace(_CARET_RE, (_m, base, exp) => {
    const e = exp.startsWith('{') ? exp.slice(1, -1) : exp;
    return `$${base}^{${e}}$`;
  });
  _UNDER_RE.lastIndex = 0;
  t = t.replace(_UNDER_RE, (_m, base, sub) => {
    const s = sub.startsWith('{') ? sub.slice(1, -1) : sub;
    return `$${base}_{${s}}$`;
  });

  // Unicode subscript/superscript chars → $...$
  if (![...t].some(c => isSub(c) || isSup(c))) return t;
  const chars = [...t]; let out = ''; let i = 0;
  while (i < chars.length) {
    if (isSub(chars[i]) || isSup(chars[i])) {
      let prefix = '';
      while (out.length > 0 && isFC(out[out.length - 1])) { prefix = out[out.length - 1] + prefix; out = out.slice(0, -1); }
      let formula = prefix;
      while (i < chars.length) {
        const c = chars[i];
        if (isSub(c)) { let d=''; while(i<chars.length&&isSub(chars[i])){d+=_SUB[chars[i]];i++;} formula+=`_{${d}}`; }
        else if (isSup(c)) { let d=''; while(i<chars.length&&isSup(chars[i])){d+=_SUP[chars[i]];i++;} formula+=`^{${d}}`; }
        else if (isFC(c)) { formula+=c; i++; if(i<chars.length&&(isSub(chars[i])||isSup(chars[i]))) continue; break; }
        else break;
      }
      out += `$${formula}$`;
    } else { out += chars[i]; i++; }
  }
  return out;
}

/**
 * Convert plain-text caret/subscript notation and Unicode script chars to
 * $...$ LaTeX segments, but only in portions that are NOT already inside
 * existing $...$ / $$...$$ math delimiters (avoids double-wrapping DB values
 * that were already correctly converted on import, e.g. "$10^{13}$").
 */
function convertScriptsToLatex(text: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    // Preserve block math $$...$$
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) { parts.push(text.slice(i, end + 2)); i = end + 2; continue; }
    }
    // Preserve inline math $...$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1);
      if (end !== -1) { parts.push(text.slice(i, end + 1)); i = end + 1; continue; }
    }
    // Plain-text chunk up to the next $ (or end of string)
    const next = text.indexOf('$', i);
    const chunk = next === -1 ? text.slice(i) : text.slice(i, next);
    if (chunk) parts.push(_convertPlainChunk(chunk));
    i = next === -1 ? text.length : next;
  }
  return parts.join('');
}

/**
 * Split text containing $...$ and $$...$$ into segments.
 * Math segments are pre-rendered to PNG buffers.
 */
export async function renderMathSegments(
  text: string,
  maxWidthPt = 256,
): Promise<MathSegment[]> {
  // Convert any Unicode subscript/superscript chars still in the text
  // (from older DB rows imported before the parser fix).
  text = convertScriptsToLatex(text);

  const segments: MathSegment[] = [];
  let i = 0;

  while (i < text.length) {
    // Block math $$...$$
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        const latex = text.slice(i + 2, end).trim();
        const rendered = await latexToPng(latex, true, maxWidthPt);
        if (rendered) {
          segments.push({ type: "math", display: true, ...rendered });
        } else {
          segments.push({ type: "text", content: `[${latex}]` });
        }
        i = end + 2;
        continue;
      }
    }
    // Inline math $...$
    if (text[i] === "$") {
      const end = text.indexOf("$", i + 1);
      if (end !== -1) {
        const latex = text.slice(i + 1, end).trim();
        // Auto-promote to display mode when the formula contains constructs
        // that are unreadable at inline (textstyle) size.
        const forceDisplay = needsDisplayMode(latex);
        const rendered = await latexToPng(latex, forceDisplay, maxWidthPt);
        if (rendered) {
          segments.push({ type: "math", display: forceDisplay, ...rendered });
        } else {
          segments.push({ type: "text", content: latex });
        }
        i = end + 1;
        continue;
      }
    }
    // Plain text up to next $
    const next = text.indexOf("$", i);
    if (next === -1) {
      const content = text.slice(i);
      if (content) segments.push({ type: "text", content });
      break;
    }
    const content = text.slice(i, next);
    if (content) segments.push({ type: "text", content });
    i = next;
  }

  return segments;
}
