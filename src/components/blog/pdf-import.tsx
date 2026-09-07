"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { parsePdfInBrowser } from "@/lib/pdf-client";
import type { BlogDocument } from "@/types/blog";
import { cn } from "@/lib/utils";

const MAX_MB = 100; // parsed in the browser, so no serverless upload limit applies

const fmtSize = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export function PdfImport({ onImported }: { onImported: (doc: BlogDocument, file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageText, setStageText] = useState("Reading file…");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (f: File): string | null => {
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return "Please choose a .pdf file.";
    if (f.size === 0) return "That file is empty.";
    if (f.size > MAX_MB * 1024 * 1024) return `PDF is too large (max ${MAX_MB} MB).`;
    return null;
  };

  const run = useCallback(async (f: File) => {
    const err = validate(f);
    if (err) { setError(err); return; }
    setError(null); setFile(f); setBusy(true); setStageText("Reading file…");
    try {
      // parsed entirely in the browser — the raw PDF is never uploaded
      const doc = await parsePdfInBrowser(f, setStageText);
      onImported(doc, f);
    } catch (e) {
      setError((e as Error).message || "Could not convert this PDF.");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }, [onImported]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) run(f);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          busy ? "cursor-default border-border bg-card" : "cursor-pointer hover:border-primary/50 hover:bg-secondary/40",
          dragging ? "border-primary bg-[var(--chip)]" : "border-border"
        )}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ""; }} />

        {!busy ? (
          <>
            <div className="grid size-14 place-items-center rounded-2xl bg-[var(--chip)] text-primary">
              <UploadCloud className="size-7" />
            </div>
            <p className="mt-4 text-lg font-semibold">Upload a PDF</p>
            <p className="mt-1 text-sm text-muted-foreground">Drag &amp; drop your PDF here, or</p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold">
              <FileText className="size-4" /> Choose PDF
            </span>
            <p className="mt-4 text-xs text-muted-foreground">Parsed locally in your browser — no AI, no upload</p>
          </>
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-left">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{file ? fmtSize(file.size) : ""}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              {stageText}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-[color-mix(in_srgb,var(--danger-c)_10%,transparent)] px-4 py-3 text-sm text-destructive">
          <X className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
