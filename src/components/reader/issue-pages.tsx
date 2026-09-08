"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Highlighter, Loader2, Columns2, Square, Eraser, Trash2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const RENDER_W = 1500; // render resolution; CSS scales to the column width

interface Hl { id: string; color: string; x: number; y: number; w: number; h: number }
type Marks = Record<number, Hl[]>;

const COLORS = ["#ffd23f", "#f472b6", "#4ade80", "#60a5fa"];
let hid = 0;
const hlId = () => `h${Date.now().toString(36)}${hid++}`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// sample the page's dominant background colour from its edges, so the frame /
// gaps around the pages match the PDF instead of showing white.
function sampleBg(canvas: HTMLCanvasElement): string | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const W = canvas.width, H = canvas.height;
    const pts: [number, number][] = [
      [2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3],
      [W >> 1, 2], [W >> 1, H - 3], [2, H >> 1], [W - 3, H >> 1],
    ];
    const counts: Record<string, number> = {};
    for (const [x, y] of pts) { const d = ctx.getImageData(x, y, 1, 1).data; const c = `${d[0]},${d[1]},${d[2]}`; counts[c] = (counts[c] ?? 0) + 1; }
    let best = "", bn = 0;
    for (const c in counts) if (counts[c] > bn) { bn = counts[c]; best = c; }
    return best ? `rgb(${best})` : null;
  } catch { return null; }
}
// overlap ratio of `a` covered by existing highlight `h`
const covered = (a: Omit<Hl, "id" | "color">, h: Hl) => {
  const ix = Math.max(0, Math.min(a.x + a.w, h.x + h.w) - Math.max(a.x, h.x));
  const iy = Math.max(0, Math.min(a.y + a.h, h.y + h.h) - Math.max(a.y, h.y));
  const area = a.w * a.h;
  return area > 0 ? (ix * iy) / area : 0;
};

export function IssuePages({ pdfUrl, storageKey }: { pdfUrl: string; storageKey: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(0);
  const [cols, setCols] = useState<1 | 2>(1);
  const [markMode, setMarkMode] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [marks, setMarks] = useState<Marks>({});
  const [bgColor, setBgColor] = useState<string | null>(null);

  const canvases = useRef<Map<number, HTMLCanvasElement>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagesRef = useRef<Map<number, any>>(new Map());
  const markModeRef = useRef(markMode); useEffect(() => { markModeRef.current = markMode; }, [markMode]);
  const colorRef = useRef(color); useEffect(() => { colorRef.current = color; }, [color]);

  const key = `a365.pagemarks.${storageKey}`;

  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setMarks(JSON.parse(raw)); } catch { /* ignore */ }
  }, [key]);
  const persist = useCallback((next: Marks) => {
    setMarks(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
  }, [key]);

  // ---- text layer (selectable) ------------------------------------------
  const renderText = useCallback(async (p: number) => {
    const page = pagesRef.current.get(p);
    const container = document.querySelector<HTMLElement>(`[data-textlayer="${p}"]`);
    const box = document.querySelector<HTMLElement>(`[data-page="${p}"]`);
    if (!page || !container || !box) return;
    const w = box.clientWidth;
    if (!w) return;
    try {
      const base = page.getViewport({ scale: 1 });
      const scale = w / base.width;
      container.replaceChildren();
      container.style.setProperty("--scale-factor", String(scale));
      container.style.setProperty("--total-scale-factor", String(scale));
      const tl = new pdfjsLib.TextLayer({ textContentSource: await page.getTextContent(), container, viewport: page.getViewport({ scale }) });
      await tl.render();
    } catch { /* ignore */ }
  }, []);
  const renderAllText = useCallback(() => { for (const p of pagesRef.current.keys()) renderText(p); }, [renderText]);

  // ---- load + render every page -----------------------------------------
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
          pagesRef.current.set(p, page);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: RENDER_W / base.width });
          let canvas = canvases.current.get(p);
          for (let t = 0; !canvas && t < 20; t++) { await new Promise((r) => setTimeout(r, 50)); canvas = canvases.current.get(p); }
          if (!canvas) continue;
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          if (p === 1) { const bg = sampleBg(canvas); if (bg && !cancelled) setBgColor(bg); }
          await renderText(p);
          if (!cancelled) setDone((d) => Math.max(d, p));
        }
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; pagesRef.current.clear(); doc?.destroy?.().catch(() => {}); };
  }, [pdfUrl, renderText]);

  // rebuild text layers when the page display width changes (resize / col toggle)
  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(renderAllText, 120);
    const onR = () => renderAllText();
    let deb: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(deb); deb = setTimeout(onR, 180); };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); clearTimeout(deb); window.removeEventListener("resize", onResize); };
  }, [phase, cols, renderAllText]);

  // ---- turn a text selection into highlights ----------------------------
  useEffect(() => {
    const commit = () => {
      if (!markModeRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const rects = Array.from(sel.getRangeAt(0).getClientRects());
      const adds: { page: number; x: number; y: number; w: number; h: number }[] = [];
      for (const rc of rects) {
        if (rc.width < 3 || rc.height < 3) continue;
        const el = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2)?.closest<HTMLElement>("[data-page]");
        if (!el) continue;
        const pr = el.getBoundingClientRect();
        adds.push({
          page: Number(el.getAttribute("data-page")),
          x: clamp01((rc.left - pr.left) / pr.width), y: clamp01((rc.top - pr.top) / pr.height),
          w: rc.width / pr.width, h: rc.height / pr.height,
        });
      }
      if (!adds.length) return;
      setMarks((prev) => {
        const next: Marks = { ...prev };
        for (const a of adds) {
          const ex = next[a.page] ?? [];
          if (ex.some((h) => covered(a, h) > 0.5)) continue; // don't stack on the same words
          next[a.page] = [...ex, { id: hlId(), color: colorRef.current, x: a.x, y: a.y, w: a.w, h: a.h }];
        }
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      sel.removeAllRanges();
    };
    const onUp = () => setTimeout(commit, 0);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => { document.removeEventListener("mouseup", onUp); document.removeEventListener("touchend", onUp); };
  }, [key]);

  const clearPage = (p: number) => { const next = { ...marks }; delete next[p]; persist(next); };
  const clearAll = () => persist({});

  if (phase === "error") {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Couldn&apos;t open this issue.</div>;
  }

  const pages = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div>
      {/* toolbar — pinned as a bar under the site header while scrolling */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:px-6">
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
          title="Highlight text — select words to mark them"
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
            <span className="text-xs text-muted-foreground">Select text to highlight it</span>
          </>
        )}
      </div>

      {phase === "loading" && (
        <div className="grid min-h-[50vh] place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
      )}

      {/* pages, stacked edge-to-edge (1 or 2 across) */}
      <div
        style={{ background: bgColor ?? "#ffffff" }}
        className={cn("mx-auto grid w-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]",
          markMode && "hl",
          cols === 2 ? "max-w-[1400px] grid-cols-2" : "max-w-[900px] grid-cols-1")}>
        {pages.map((p) => (
          <div key={p} data-page={p} className={cn("page-pdf relative", markMode && "cursor-text")}>
            <canvas
              ref={(el) => { if (el) canvases.current.set(p, el); else canvases.current.delete(p); }}
              className="block w-full"
              style={{ height: "auto" }}
            />
            <div className="textLayer" data-textlayer={p} />
            {/* highlight overlay — above text, non-interactive */}
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 7 }}>
              {(marks[p] ?? []).map((h) => (
                <div key={h.id} style={{
                  position: "absolute", left: `${h.x * 100}%`, top: `${h.y * 100}%`,
                  width: `${h.w * 100}%`, height: `${h.h * 100}%`,
                  background: h.color, opacity: 0.4, mixBlendMode: "multiply", borderRadius: 2,
                }} />
              ))}
            </div>
            {markMode && (marks[p]?.length ?? 0) > 0 && (
              <button onClick={() => clearPage(p)} title="Clear this page"
                className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-lg border border-border bg-card/90 text-muted-foreground hover:text-foreground">
                <Eraser className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {phase === "ready" && done < count && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Rendering pages… {done}/{count}
        </p>
      )}
    </div>
  );
}
