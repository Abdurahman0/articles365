"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Highlighter, Loader2, Columns2, Square, Eraser, Trash2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const RENDER_W = 1500; // render resolution; CSS scales to the column width

type Pt = { x: number; y: number };
interface Stroke { id: string; color: string; pts: Pt[] }
type Marks = Record<number, Stroke[]>;

const COLORS = ["#ffd23f", "#f472b6", "#4ade80", "#60a5fa"];
let sid = 0;
const strokeId = () => `s${Date.now().toString(36)}${sid++}`;

export function IssuePages({ pdfUrl, storageKey }: { pdfUrl: string; storageKey: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(0);
  const [cols, setCols] = useState<1 | 2>(1);
  const [markMode, setMarkMode] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [marks, setMarks] = useState<Marks>({});
  const [draw, setDraw] = useState<{ page: number; stroke: Stroke } | null>(null);
  const canvases = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const key = `a365.pagemarks.${storageKey}`;

  // ---- load saved marks -------------------------------------------------
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setMarks(JSON.parse(raw)); } catch { /* ignore */ }
  }, [key]);
  const persist = useCallback((next: Marks) => {
    setMarks(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);

  // ---- render every page to a canvas ------------------------------------
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let doc: any = null;
    (async () => {
      try {
        const buf = await (await fetch(pdfUrl)).arrayBuffer();
        if (cancelled) return;
        const params = { data: new Uint8Array(buf), isEvalSupported: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc = await pdfjsLib.getDocument(params as any).promise;
        if (cancelled || !doc) return;
        setCount(doc.numPages);
        setPhase("ready");
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return;
          const page = await doc.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: RENDER_W / base.width });
          let canvas = canvases.current.get(p);
          for (let t = 0; !canvas && t < 20; t++) { await new Promise((r) => setTimeout(r, 50)); canvas = canvases.current.get(p); }
          if (!canvas) continue;
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          page.cleanup?.();
          if (!cancelled) setDone((d) => Math.max(d, p));
        }
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; doc?.destroy?.().catch(() => {}); };
  }, [pdfUrl]);

  // ---- drawing ----------------------------------------------------------
  const ptFrom = (e: React.PointerEvent, el: SVGSVGElement): Pt => {
    const r = el.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const onDown = (p: number) => (e: React.PointerEvent<SVGSVGElement>) => {
    if (!markMode) return;
    e.preventDefault();
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    setDraw({ page: p, stroke: { id: strokeId(), color, pts: [ptFrom(e, e.currentTarget)] } });
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draw) return;
    const pt = ptFrom(e, e.currentTarget);
    setDraw((d) => (d ? { ...d, stroke: { ...d.stroke, pts: [...d.stroke.pts, pt] } } : d));
  };
  const onUp = () => {
    if (!draw) return;
    if (draw.stroke.pts.length > 1) {
      const next = { ...marks, [draw.page]: [...(marks[draw.page] ?? []), draw.stroke] };
      persist(next);
    }
    setDraw(null);
  };

  const clearPage = (p: number) => { const next = { ...marks }; delete next[p]; persist(next); };
  const clearAll = () => persist({});

  const toPoints = (pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  if (phase === "error") {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Couldn&apos;t open this issue.</div>;
  }

  const pages = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div>
      {/* toolbar */}
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 backdrop-blur">
        <div className="flex rounded-xl border border-border p-0.5">
          <button onClick={() => setCols(1)} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", cols === 1 && "bg-secondary")}>
            <Square className="size-3.5" /> 1 page
          </button>
          <button onClick={() => setCols(2)} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", cols === 2 && "bg-secondary")}>
            <Columns2 className="size-3.5" /> 2 pages
          </button>
        </div>

        <span className="mx-1 h-6 w-px bg-border" />

        <button
          onClick={() => setMarkMode((v) => !v)}
          className={cn("flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors",
            markMode ? "border-primary/60 bg-primary/15 text-primary" : "border-border hover:bg-secondary")}
        >
          <Highlighter className="size-3.5" /> Mark
        </button>
        {markMode && (
          <>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={c}
                className={cn("size-6 rounded-full ring-1 ring-black/20 transition", color === c && "ring-2 ring-offset-1 ring-primary")}
                style={{ background: c }} />
            ))}
            <button onClick={clearAll} className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-secondary">
              <Trash2 className="size-3.5" /> Clear all
            </button>
          </>
        )}
      </div>

      {phase === "loading" && (
        <div className="grid min-h-[50vh] place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
      )}

      {/* pages, stacked edge-to-edge (1 or 2 across) */}
      <div className={cn("mx-auto grid w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-soft)]",
        cols === 2 ? "max-w-[1400px] grid-cols-2" : "max-w-[900px] grid-cols-1")}>
        {pages.map((p) => {
          const strokes = [...(marks[p] ?? []), ...(draw?.page === p ? [draw.stroke] : [])];
          return (
            <div key={p} className="relative">
              <canvas
                ref={(el) => { if (el) canvases.current.set(p, el); else canvases.current.delete(p); }}
                className="block w-full"
                style={{ height: "auto" }}
              />
              <svg
                viewBox="0 0 1 1" preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                style={{ pointerEvents: markMode ? "auto" : "none", touchAction: markMode ? "none" : "auto", cursor: markMode ? "crosshair" : "default" }}
                onPointerDown={onDown(p)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                {strokes.map((s) => (
                  <polyline key={s.id} points={toPoints(s.pts)} fill="none" stroke={s.color}
                    strokeWidth={14} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.45} />
                ))}
              </svg>
              {markMode && (marks[p]?.length ?? 0) > 0 && (
                <button onClick={() => clearPage(p)} title="Clear this page"
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg border border-border bg-card/90 text-muted-foreground hover:text-foreground">
                  <Eraser className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {phase === "ready" && done < count && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Rendering pages… {done}/{count}
        </p>
      )}
    </div>
  );
}
