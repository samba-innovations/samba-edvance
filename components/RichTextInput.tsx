"use client";

/**
 * RichTextInput — textarea com preview de LaTeX ($...$) e upload de imagens.
 * Usado no formulário manual de questões.
 */

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { RichText } from "@/components/RichText";
import { uploadManualImage } from "@/lib/exam-actions";

interface RichTextInputProps {
  value: string;
  onChange: (v: string) => void;
  images: string[];
  onImagesChange: (imgs: string[]) => void;
  placeholder?: string;
  rows?: number;
  examId: number;
}

export function RichTextInput({
  value,
  onChange,
  images,
  onImagesChange,
  placeholder,
  rows = 4,
  examId,
}: RichTextInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState("");

  const hasLatex = value.includes("$");

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset input so same file can be picked again
    setUploadError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("exam_id", String(examId));

    startUpload(async () => {
      const res = await uploadManualImage(fd);
      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        onImagesChange([...images, res.url]);
      }
    });
  }

  function removeImage(idx: number) {
    onImagesChange(images.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-mono"
        />
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          Use <code className="bg-muted px-1 rounded">$formula$</code> para LaTeX inline &nbsp;·&nbsp;
          <code className="bg-muted px-1 rounded">$$formula$$</code> para bloco
        </p>
      </div>

      {/* Preview LaTeX (só aparece se tiver $) */}
      {hasLatex && (
        <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Prévia</p>
          <RichText text={value} className="text-foreground" />
        </div>
      )}

      {/* Imagens */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-24 rounded-lg border border-border/40 object-contain bg-muted/20"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botão de upload */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition-all disabled:opacity-50"
        >
          {uploading
            ? <><Loader2 size={12} className="animate-spin" /> Enviando…</>
            : <><ImageIcon size={12} /> Adicionar imagem</>}
        </button>
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </div>
  );
}
