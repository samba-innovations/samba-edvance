/**
 * DOCX question parser with OMML→LaTeX support and image extraction.
 * Handles two question formats:
 *   Format A (natural):   "1. stem\na) option A\nb) option B\n*gabarito: A"
 *   Format B (technical): "Q: stem\nA) option A\nB) option B\n*gabarito: A"
 *
 * Images found within a question's paragraph range are extracted to
 * public/uploads/exam-{examId}/ and linked to the question.
 */

import JSZip from "jszip";
import fs from "fs";
import path from "path";

export type ParsedQuestion = {
  stem: string;
  correctLabel: string | null;
  options: Array<{ label: string; text: string }>;
  images: string[];
  /** Raw index in document, 0-based */
  index: number;
};

// ─── Unicode subscript / superscript → LaTeX ─────────────────────────────────

/** Maps Unicode subscript digit/sign chars to their ASCII equivalents */
const SUB_CHAR: Record<string, string> = {
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4',
  '₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
};
/** Maps Unicode superscript digit/sign chars to ASCII */
const SUP_CHAR: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4',
  '⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-',
};
/** Maps ASCII digits → Unicode subscript char (for <w:vertAlign> pre-processing) */
const TO_SUB: Record<string, string> = Object.fromEntries(Object.entries(SUB_CHAR).map(([k,v])=>[v,k]));
/** Maps ASCII digits/signs → Unicode superscript char */
const TO_SUP: Record<string, string> = Object.fromEntries(Object.entries(SUP_CHAR).map(([k,v])=>[v,k]));

// Matches plain-text caret/underscore notation: base^exp or base_sub
const _CARET_RE = /([A-Za-z0-9]+)\^(\{[^}]*\}|[A-Za-z0-9]+)/g;
// Underscores: only convert when the subscript is purely numeric (e.g. x_0, H_2)
const _UNDER_RE = /([A-Za-z0-9]+)_(\{[0-9]+\}|[0-9]+)/g;

/**
 * Convert sequences of Unicode subscript/superscript digits embedded in plain
 * text into LaTeX $_{n}$ / $^{n}$ inline math segments.
 * Also handles plain-text caret notation: 10^13 → $10^{13}$.
 *
 * Example: "C₄H₈O₂; 88 g/mol" → "$C_{4}H_{8}O_{2}$; 88 g/mol"
 * Example: "10^13" → "$10^{13}$"
 */
function convertScriptsToLatex(text: string): string {
  const isSub = (c: string) => c in SUB_CHAR;
  const isSup = (c: string) => c in SUP_CHAR;
  const isFormulaChar = (c: string) => /[A-Za-z0-9]/.test(c);

  // First pass: plain-text caret/underscore → $...$ (only outside existing math)
  let t = text;
  t = t.replace(_CARET_RE, (_m: string, base: string, exp: string) => {
    const e = exp.startsWith('{') ? exp.slice(1, -1) : exp;
    return `$${base}^{${e}}$`;
  });
  t = t.replace(_UNDER_RE, (_m: string, base: string, sub: string) => {
    const s = sub.startsWith('{') ? sub.slice(1, -1) : sub;
    return `$${base}_{${s}}$`;
  });

  if (![...t].some(c => isSub(c) || isSup(c))) return t;

  const chars = [...t];
  let out = '';
  let i = 0;

  while (i < chars.length) {
    if (isSub(chars[i]) || isSup(chars[i])) {
      // Back-track: pull any trailing formula chars from `out` into the formula
      let prefix = '';
      while (out.length > 0 && isFormulaChar(out[out.length - 1])) {
        prefix = out[out.length - 1] + prefix;
        out = out.slice(0, -1);
      }

      let formula = prefix;

      // Forward-consume formula chars + script chars
      while (i < chars.length) {
        const c = chars[i];
        if (isSub(c)) {
          let digits = '';
          while (i < chars.length && isSub(chars[i])) { digits += SUB_CHAR[chars[i]]; i++; }
          formula += `_{${digits}}`;
        } else if (isSup(c)) {
          let digits = '';
          while (i < chars.length && isSup(chars[i])) { digits += SUP_CHAR[chars[i]]; i++; }
          formula += `^{${digits}}`;
        } else if (isFormulaChar(c)) {
          formula += c; i++;
          // Continue only if the next char is a script
          if (i < chars.length && (isSub(chars[i]) || isSup(chars[i]))) continue;
          break;
        } else {
          break;
        }
      }

      out += `$${formula}$`;
    } else {
      out += chars[i]; i++;
    }
  }

  return out;
}

// ─── OMML → LaTeX ─────────────────────────────────────────────────────────────

const SYMBOL_MAP: Record<string, string> = {
  "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta",
  "ε": "\\epsilon", "θ": "\\theta", "λ": "\\lambda", "μ": "\\mu",
  "π": "\\pi", "σ": "\\sigma", "τ": "\\tau", "φ": "\\phi",
  "ω": "\\omega", "Σ": "\\Sigma", "Δ": "\\Delta", "Ω": "\\Omega",
  "∞": "\\infty", "≤": "\\leq", "≥": "\\geq", "≠": "\\neq",
  "±": "\\pm", "×": "\\times", "÷": "\\div", "√": "\\sqrt",
  "∫": "\\int", "∑": "\\sum", "∏": "\\prod",
  "…": "\\ldots", "\u22EF": "\\cdots",
};

/** Strip XML tags, return text content */
function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, "");
}

/** Decode XML/HTML entities that appear literally inside <w:t> raw XML */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Get inner content of first matching tag, correctly handling nested same-name tags.
 * A simple lazy regex fails when e.g. <m:e> contains another <m:e>.
 */
function innerXml(xml: string, tag: string): string {
  const openStr = `<${tag}`;
  const closeStr = `</${tag}>`;

  const firstOpen = xml.indexOf(openStr);
  if (firstOpen === -1) return "";

  // Skip past the full opening tag (up to and including ">")
  const tagEnd = xml.indexOf(">", firstOpen);
  if (tagEnd === -1) return "";
  const contentStart = tagEnd + 1;

  let depth = 1;
  let i = contentStart;

  while (i < xml.length && depth > 0) {
    const nextOpen = xml.indexOf(openStr, i);
    const nextClose = xml.indexOf(closeStr, i);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) return xml.slice(contentStart, nextClose);
      i = nextClose + closeStr.length;
    }
  }
  return "";
}

function ommlToLatex(xml: string): string {
  // Fraction: <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
  // m:type m:val="noBar" = binomial coefficient (no bar, delimiters added by surrounding m:d)
  xml = xml.replace(/<m:f>([\s\S]*?)<\/m:f>/g, (_match: string, inner: string) => {
    const noBar = /<m:type\s+m:val="noBar"/.test(inner);
    const num = ommlToLatex(innerXml(inner, "m:num"));
    const den = ommlToLatex(innerXml(inner, "m:den"));
    // \genfrac{left}{right}{thickness}{style}{num}{den}
    // empty delimiters + 0pt thickness = stacked without bar or parens
    return noBar
      ? `\\genfrac{}{}{0pt}{}{${num}}{${den}}`
      : `\\frac{${num}}{${den}}`;
  });

  // Radical: <m:rad><m:deg>...</m:deg><m:e>...</m:e></m:rad>
  xml = xml.replace(/<m:rad>([\s\S]*?)<\/m:rad>/g, (_match: string, inner: string) => {
    const deg = stripTags(innerXml(inner, "m:deg")).trim();
    const base = ommlToLatex(innerXml(inner, "m:e"));
    return deg ? `\\sqrt[${deg}]{${base}}` : `\\sqrt{${base}}`;
  });

  // Superscript: <m:sSup><m:e>...</m:e><m:sup>...</m:sup></m:sSup>
  xml = xml.replace(/<m:sSup>([\s\S]*?)<\/m:sSup>/g, (_match: string, inner: string) => {
    const base = ommlToLatex(innerXml(inner, "m:e"));
    const sup = ommlToLatex(innerXml(inner, "m:sup"));
    return `{${base}}^{${sup}}`;
  });

  // Subscript: <m:sSub><m:e>...</m:e><m:sub>...</m:sub></m:sSub>
  xml = xml.replace(/<m:sSub>([\s\S]*?)<\/m:sSub>/g, (_match: string, inner: string) => {
    const base = ommlToLatex(innerXml(inner, "m:e"));
    const sub = ommlToLatex(innerXml(inner, "m:sub"));
    return `{${base}}_{${sub}}`;
  });

  // Sub+Sup: <m:sSubSup>
  xml = xml.replace(/<m:sSubSup>([\s\S]*?)<\/m:sSubSup>/g, (_match: string, inner: string) => {
    const base = ommlToLatex(innerXml(inner, "m:e"));
    const sub = ommlToLatex(innerXml(inner, "m:sub"));
    const sup = ommlToLatex(innerXml(inner, "m:sup"));
    return `{${base}}_{${sub}}^{${sup}}`;
  });

  // N-ary (sum, integral, etc.): <m:nary>
  xml = xml.replace(/<m:nary>([\s\S]*?)<\/m:nary>/g, (_match: string, inner: string) => {
    const chrMatch = inner.match(/<m:chr m:val="([^"]+)"/);
    const chr = chrMatch ? chrMatch[1] : "∑";
    const sub = ommlToLatex(innerXml(inner, "m:sub"));
    const sup = ommlToLatex(innerXml(inner, "m:sup"));
    const body = ommlToLatex(innerXml(inner, "m:e"));
    const latexChr = chr === "∑" || chr === "\u2211" ? "\\sum"
      : chr === "∫" || chr === "\u222B" ? "\\int"
      : chr === "∏" || chr === "\u220F" ? "\\prod"
      : `\\${chr}`;
    const limits = sub || sup ? `_{${sub}}^{${sup}}` : "";
    return `${latexChr}${limits}{${body}}`;
  });

  // Delimiter: <m:d><m:dPr>...</m:dPr><m:e>...</m:e></m:d>
  xml = xml.replace(/<m:d>([\s\S]*?)<\/m:d>/g, (_match: string, inner: string) => {
    const begChrMatch = inner.match(/<m:begChr m:val="([^"]*)"/);
    const endChrMatch = inner.match(/<m:endChr m:val="([^"]*)"/);
    const beg = begChrMatch ? begChrMatch[1] : "(";
    const end = endChrMatch ? endChrMatch[1] : ")";
    const body = ommlToLatex(innerXml(inner, "m:e"));
    return `\\left${beg}${body}\\right${end}`;
  });

  // Math run text: <m:t>
  xml = xml.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g, (_match: string, text: string) => {
    // Decode XML entities first (e.g. &lt; → <, &gt; → >)
    let result = decodeXmlEntities(text);
    for (const [char, latex] of Object.entries(SYMBOL_MAP)) {
      result = result.split(char).join(latex);
    }
    return result;
  });

  // Strip ALL remaining XML tags (m: and any w: run-property tags inside math blocks)
  xml = xml.replace(/<[^>]+>/g, "");
  return xml.trim();
}

// ─── Text + image extraction from word/document.xml ───────────────────────────

type Paragraph = { text: string; hasFormula: boolean; imageRids: string[] };

/**
 * Parse word/_rels/document.xml.rels to build a map: rId → media filename
 * e.g. "rId5" → "image1.png"
 */
function parseRels(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml)) !== null) {
    const rId = m[1];
    const target = m[2]; // e.g. "media/image1.png"
    if (target.startsWith("media/")) {
      map.set(rId, path.basename(target));
    }
  }
  return map;
}

function extractParagraphs(docXml: string): Paragraph[] {
  // Match non-self-closing paragraphs only.
  // Self-closing <w:p .../> are empty paragraphs that would otherwise cause
  // the lazy [\s\S]*? to bleed into the next paragraph's content.
  // Pattern: <w:p> or <w:p attrs> where attrs don't end with / before >
  const paraRe = /<w:p(?:\s[^>]*?[^\/])?>([\s\S]*?)<\/w:p>/g;
  const paragraphs: Paragraph[] = [];
  let m: RegExpExecArray | null;

  while ((m = paraRe.exec(docXml)) !== null) {
    const paraXml = m[1];
    let text = "";
    let hasFormula = false;
    const imageRids: string[] = [];

    // Extract image rIds from <w:drawing> blocks
    const drawingRe = /<w:drawing>([\s\S]*?)<\/w:drawing>/g;
    let dm: RegExpExecArray | null;
    while ((dm = drawingRe.exec(paraXml)) !== null) {
      const embedRe = /r:embed="([^"]+)"/g;
      let em: RegExpExecArray | null;
      while ((em = embedRe.exec(dm[1])) !== null) {
        imageRids.push(em[1]);
      }
    }
    // Also check <v:imagedata r:id="..."> (older format)
    const imgdataRe = /<v:imagedata[^>]+r:id="([^"]+)"/g;
    let im: RegExpExecArray | null;
    while ((im = imgdataRe.exec(paraXml)) !== null) {
      imageRids.push(im[1]);
    }

    // Build text: interleave w:t and OMML math.
    // <m:oMathPara> = block/display math (use $$...$$); bare <m:oMath> = inline ($...$).
    let nodes = paraXml;

    // ── Pre-process <w:vertAlign> subscript/superscript runs ──────────────────
    // Word stores subscripts like C₄ as a plain-text run with <w:vertAlign w:val="subscript"/>.
    // Convert those digits to Unicode subscript/superscript chars so convertScriptsToLatex()
    // can pick them up in the same pass as embedded Unicode script chars.
    nodes = nodes.replace(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g, (_wr: string, runContent: string) => {
      const isSub = /<w:vertAlign[^>]+w:val="subscript"/.test(runContent);
      const isSup = /<w:vertAlign[^>]+w:val="superscript"/.test(runContent);
      if (!isSub && !isSup) return _wr;
      return runContent.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_wt: string, t: string) => {
        const decoded = decodeXmlEntities(t);
        const mapped = [...decoded].map(c => (isSub ? TO_SUB[c] : TO_SUP[c]) ?? c).join('');
        return `<w:t>${mapped}</w:t>`;
      });
    });

    // Block math first (oMathPara wraps oMath)
    nodes = nodes.replace(/<m:oMathPara>([\s\S]*?)<\/m:oMathPara>/g, (_mp: string, paraContent: string) =>
      paraContent.replace(/<m:oMath>([\s\S]*?)<\/m:oMath>/g, (_m2: string, mathXml: string) => {
        hasFormula = true;
        return `⟨MATHBLOCK:${ommlToLatex(mathXml)}⟩`;
      })
    );
    // Remaining inline math
    nodes = nodes.replace(/<m:oMath>([\s\S]*?)<\/m:oMath>/g, (_m2: string, mathXml: string) => {
      hasFormula = true;
      return `⟨MATH:${ommlToLatex(mathXml)}⟩`;
    });

    // Collect segments typed so we can merge consecutive plain-text <w:t> runs
    // before applying convertScriptsToLatex.  This allows the backtracking logic
    // in convertScriptsToLatex to span multiple adjacent <w:t> elements — critical
    // for Word superscript runs like "10" (normal) + "13" (superscript) → "$10^{13}$".
    const segRe = /(?:<w:t[^>]*>([\s\S]*?)<\/w:t>)|⟨MATHBLOCK:([\s\S]*?)⟩|⟨MATH:([\s\S]*?)⟩/g;
    let seg: RegExpExecArray | null;
    type RawSeg = { k: 'text'; v: string } | { k: 'math'; v: string };
    const rawSegs: RawSeg[] = [];
    while ((seg = segRe.exec(nodes)) !== null) {
      if (seg[1] !== undefined) rawSegs.push({ k: 'text', v: decodeXmlEntities(seg[1]) });
      else if (seg[2] !== undefined) rawSegs.push({ k: 'math', v: `$$${seg[2]}$$` });
      else if (seg[3] !== undefined) rawSegs.push({ k: 'math', v: `$${seg[3]}$` });
    }
    // Merge + convert
    for (let j = 0; j < rawSegs.length; ) {
      if (rawSegs[j].k === 'text') {
        let combined = '';
        while (j < rawSegs.length && rawSegs[j].k === 'text') { combined += rawSegs[j].v; j++; }
        text += convertScriptsToLatex(combined);
      } else {
        text += rawSegs[j].v; j++;
      }
    }

    text = text.trim();
    if (text || imageRids.length > 0) {
      paragraphs.push({ text, hasFormula, imageRids });
    }
  }

  return paragraphs;
}

// ─── Question parser ──────────────────────────────────────────────────────────

const GABARITO_RE = /^\*?\s*gabarito\s*:\s*([A-Ea-e])\s*$/i;

// Format A: "1. stem" → natural numbered questions
const FORMAT_A_QUESTION = /^\d+[.)]\s+(.+)$/;
// Format A: "a) text" → options
const FORMAT_A_OPTION = /^([a-e])\)\s*(.+)$/i;

// Format B: "Q: stem" or "Q) stem"
const FORMAT_B_QUESTION = /^Q[:)]\s*(.+)$/i;
// Format B: "A) text" → options
const FORMAT_B_OPTION = /^([A-E])\)\s*(.+)$/;

function parseQuestions(paragraphs: Paragraph[]): Array<ParsedQuestion & { rawImageRids: string[] }> {
  const questions: Array<ParsedQuestion & { rawImageRids: string[] }> = [];
  let i = 0;

  while (i < lines(paragraphs).length) {
    const para = paragraphs[i];
    const line = para.text.trim();
    if (!line && para.imageRids.length === 0) { i++; continue; }

    let stem: string | null = null;
    let isFormatA = false;
    let isFormatB = false;
    const questionImageRids: string[] = [...para.imageRids];

    if (line) {
      const matchA = line.match(FORMAT_A_QUESTION);
      const matchB = line.match(FORMAT_B_QUESTION);
      if (matchA) { stem = matchA[1]; isFormatA = true; }
      else if (matchB) { stem = matchB[1]; isFormatB = true; }
    }

    if (!stem && para.imageRids.length === 0) { i++; continue; }
    if (!stem) { i++; continue; } // image-only paragraph, will be captured by next question

    // Collect multi-line stem
    i++;
    while (i < paragraphs.length) {
      const next = paragraphs[i];
      const nextLine = next.text.trim();

      if (!nextLine && next.imageRids.length === 0) { i++; break; }
      if (GABARITO_RE.test(nextLine)) break;
      if (isFormatA && FORMAT_A_OPTION.test(nextLine)) break;
      if (isFormatB && FORMAT_B_OPTION.test(nextLine)) break;
      // Images within the stem area belong to this question
      questionImageRids.push(...next.imageRids);
      if (nextLine) stem += " " + nextLine;
      i++;
    }

    const options: Array<{ label: string; text: string }> = [];
    let correctLabel: string | null = null;

    while (i < paragraphs.length) {
      const next = paragraphs[i];
      const nextLine = next.text.trim();
      if (!nextLine && next.imageRids.length === 0) { i++; continue; }

      const gab = nextLine.match(GABARITO_RE);
      if (gab) { correctLabel = gab[1].toUpperCase(); i++; break; }

      const optA = isFormatA ? nextLine.match(FORMAT_A_OPTION) : null;
      const optB = isFormatB ? nextLine.match(FORMAT_B_OPTION) : null;
      const opt = optA ?? optB;

      if (opt) {
        let optText = opt[2].trim();
        // Collect images within option paragraph
        questionImageRids.push(...next.imageRids);
        i++;
        // Multi-line option continuation
        while (i < paragraphs.length) {
          const cont = paragraphs[i];
          const contLine = cont.text.trim();
          if (!contLine && cont.imageRids.length === 0) break;
          if (GABARITO_RE.test(contLine)) break;
          const isNextOpt = isFormatA ? FORMAT_A_OPTION.test(contLine) : FORMAT_B_OPTION.test(contLine);
          if (isNextOpt) break;
          questionImageRids.push(...cont.imageRids);
          if (contLine) optText += " " + contLine;
          i++;
        }
        options.push({ label: opt[1].toUpperCase(), text: optText });
      } else {
        break;
      }
    }

    if (stem.trim()) {
      questions.push({
        stem: stem.trim(),
        correctLabel,
        options,
        images: [],
        rawImageRids: questionImageRids,
        index: questions.length,
      });
    }
  }

  return questions;
}

// Helper so parseQuestions can iterate
function lines(paragraphs: Paragraph[]): Paragraph[] {
  return paragraphs;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parseDocxBuffer(
  buffer: Buffer,
  examId: number
): Promise<ParsedQuestion[]> {
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.files["word/document.xml"];
  if (!docFile) throw new Error("Arquivo DOCX inválido: word/document.xml não encontrado.");

  const docXml = await docFile.async("string");
  const paragraphs = extractParagraphs(docXml);

  // Parse rels to map rId → filename
  const relsFile = zip.files["word/_rels/document.xml.rels"];
  const rIdToFile = relsFile
    ? parseRels(await relsFile.async("string"))
    : new Map<string, string>();

  const rawQuestions = parseQuestions(paragraphs);

  // Save images per question
  const uploadDir = path.join(process.cwd(), "public", "uploads", `exam-${examId}`);
  fs.mkdirSync(uploadDir, { recursive: true });

  const questions: ParsedQuestion[] = [];

  for (const rq of rawQuestions) {
    const imagePaths: string[] = [];
    const seenRids = new Set<string>();

    for (const rId of rq.rawImageRids) {
      if (seenRids.has(rId)) continue;
      seenRids.add(rId);

      const mediaFilename = rIdToFile.get(rId);
      if (!mediaFilename) continue;

      const zipPath = `word/media/${mediaFilename}`;
      const zipFile = zip.files[zipPath];
      if (!zipFile || zipFile.dir) continue;

      const ext = path.extname(mediaFilename).toLowerCase();
      if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) continue;

      const destFilename = `q${rq.index}_${mediaFilename}`;
      const destPath = path.join(uploadDir, destFilename);
      const fileBuffer = await zipFile.async("nodebuffer");
      fs.writeFileSync(destPath, fileBuffer);
      imagePaths.push(`/uploads/exam-${examId}/${destFilename}`);
    }

    const { rawImageRids: _rids, ...rest } = rq;
    questions.push({ ...rest, images: imagePaths });
  }

  return questions;
}
