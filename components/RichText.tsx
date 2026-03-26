"use client";

/**
 * RichText — renderiza texto com fórmulas LaTeX ($...$  e  $$...$$) usando KaTeX
 * e exibe imagens associadas à questão.
 */

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Segment =
  | { type: "text"; content: string }
  | { type: "math-inline"; latex: string }
  | { type: "math-block"; latex: string };

function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;

  while (i < text.length) {
    // Block math $$...$$
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        segs.push({ type: "math-block", latex: text.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }
    // Inline math $...$
    if (text[i] === "$") {
      const end = text.indexOf("$", i + 1);
      if (end !== -1) {
        segs.push({ type: "math-inline", latex: text.slice(i + 1, end).trim() });
        i = end + 1;
        continue;
      }
    }
    // Plain text up to next $
    const next = text.indexOf("$", i);
    if (next === -1) {
      segs.push({ type: "text", content: text.slice(i) });
      break;
    }
    segs.push({ type: "text", content: text.slice(i, next) });
    i = next;
  }

  return segs;
}

function KatexSpan({ latex, display }: { latex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        output: "html",
        trust: false,
      });
    } catch {
      return `<span class="text-destructive">${latex}</span>`;
    }
  }, [latex, display]);

  return (
    <span
      className={display ? "block my-1 text-center overflow-x-auto" : "inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface RichTextProps {
  text: string;
  images?: string[];
  className?: string;
  /** Se true, renderiza como bloco com imagens abaixo */
  block?: boolean;
}

export function RichText({ text, images, className, block }: RichTextProps) {
  const segments = useMemo(() => parseSegments(text ?? ""), [text]);

  const content = (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        if (seg.type === "math-inline") return <KatexSpan key={i} latex={seg.latex} />;
        return <KatexSpan key={i} latex={seg.latex} display />;
      })}
      {images && images.length > 0 && (
        <span className={block ? "block mt-2 space-y-2" : "inline-block ml-1"}>
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="max-w-full rounded border border-border/40"
              style={{ maxHeight: "240px" }}
            />
          ))}
        </span>
      )}
    </>
  );

  if (block) {
    return <div className={className}>{content}</div>;
  }

  return <span className={className}>{content}</span>;
}
