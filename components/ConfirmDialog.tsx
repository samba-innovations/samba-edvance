"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  danger = true,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-destructive/10" : "bg-primary/10"}`}>
            <AlertTriangle size={18} className={danger ? "text-destructive" : "text-primary"} />
          </div>
          <p className="text-sm text-foreground leading-relaxed pt-1.5">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`h-9 px-4 rounded-xl text-sm font-bold transition-colors ${
              danger
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmState {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

/** Hook that replaces window.confirm() with a styled modal. */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const askConfirm = useCallback(
    (message: string, opts?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> =>
      new Promise((resolve) =>
        setState({ message, confirmLabel: opts?.confirmLabel, danger: opts?.danger ?? true, resolve })
      ),
    []
  );

  const confirmDialog = state ? (
    <ConfirmDialog
      message={state.message}
      confirmLabel={state.confirmLabel}
      danger={state.danger}
      onConfirm={() => { state.resolve(true);  setState(null); }}
      onCancel={() =>  { state.resolve(false); setState(null); }}
    />
  ) : null;

  return { confirmDialog, askConfirm };
}
