"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft, Eraser, Highlighter, Loader2, Maximize, Minimize, Minus, Plus, Scan, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Hl { id: string; x: number; y: number; w: number; h: number; color: HlColor }
type HlColor = "yellow" | "green" | "pink" | "blue";
const HL_COLORS: HlColor[] = ["yellow", "green", "pink", "blue"];
const HL_RGBA: Record<HlColor, string> = {
  yellow: "rgba(255,214,0,0.38)",
  green: "rgba(52,211,153,0.36)",
  pink: "rgba(244,114,182,0.38)",
  blue: "rgba(96,165,250,0.36)",
};
const HL_DOT: Record<HlColor, string> = {
  yellow: "bg-yellow-400", green: "bg-emerald-400", pink: "bg-pink-400", blue: "bg-blue-400",
};

const RENDER_W = 1150;
const ZOOM_MIN = 0.75, ZOOM_MAX = 3, ZOOM_STEP = 0.25;
const DEFAULT_ASPECT = 0.773; // w/h, until the first page reports its real size
let uidc = 0;
const uid = () => "h" + Date.now().toString(36) + (uidc++);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// tiled diagonal watermark, drawn as a repeating inline-SVG background (cheap,
// pointer-events:none, so it never interferes with text selection / highlights)
const WATERMARK_TEXT = "365 Magazines";
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const watermarkUrl = (text: string) => {
  const t = xmlEsc(text);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='165'>` +
    `<text x='130' y='92' transform='rotate(-27 130 82)' text-anchor='middle' ` +
    `fill='#6f6f6f' fill-opacity='0.34' font-family='Arial, Helvetica, sans-serif' ` +
    `font-size='24' font-weight='800'>${t}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
const WM_BG = watermarkUrl(WATERMARK_TEXT);

type HlMap = Record<number, Hl[]>;

export function PdfBookReader({
  pdfUrl, title, storageKey,
}: { pdfUrl: string; title: string; storageKey: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [activePage, setActivePage] = useState(1);
  const [fs, setFs] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [hlMode, setHlMode] = useState(false);
  const [hlColor, setHlColor] = useState<HlColor>("yellow");
  const [highlights, setHighlights] = useState<HlMap>({});

  const pdfDoc = useRef<PDFDocumentProxy | null>(null);
  const task = useRef<ReturnType<typeof pdfjsLib.getDocument> | null>(null);
  const canvases = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedSet = useRef<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const hlModeRef = useRef(hlMode); useEffect(() => { hlModeRef.current = hlMode; }, [hlMode]);
  const hlColorRef = useRef(hlColor); useEffect(() => { hlColorRef.current = hlColor; }, [hlColor]);

  const key = `a365.pdfhl.${storageKey}`;
  const pct = pageCount ? Math.round((activePage / pageCount) * 100) : 0;

  // ---- load PDF + saved highlights --------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setHighlights(JSON.parse(raw));
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        // load the whole file once and keep it in Cache Storage, so reopening
        // the book never re-downloads the ~10 MB PDF (instant on later visits).
        let data: ArrayBuffer | undefined;
        try {
          const cache = await caches.open("a365-pdf-v1");
          const hit = await cache.match(pdfUrl);
          if (hit) {
            data = await hit.arrayBuffer();
          } else {
            const resp = await fetch(pdfUrl);
            if (resp.ok) { await cache.put(pdfUrl, resp.clone()); data = await resp.arrayBuffer(); }
          }
        } catch { /* Cache API blocked (e.g. plain http) → fall back to URL */ }

        const t = data
          ? pdfjsLib.getDocument({ data })
          : pdfjsLib.getDocument({ url: pdfUrl, disableAutoFetch: true, disableStream: false, rangeChunkSize: 262144 });
        task.current = t;
        const doc = await t.promise;
        if (cancelled) { t.destroy(); return; }
        pdfDoc.current = doc;
        try {
          const v = (await doc.getPage(1)).getViewport({ scale: 1 });
          if (!cancelled && v.height) setAspect(v.width / v.height);
        } catch {}
        setPageCount(doc.numPages);
        setPhase("ready");
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; task.current?.destroy(); };
  }, [pdfUrl, key]);

  const save = useCallback((map: HlMap) => {
    try { localStorage.setItem(key, JSON.stringify(map)); } catch {}
  }, [key]);

  const registerCanvas = useCallback((p: number, el: HTMLCanvasElement | null) => {
    if (el) canvases.current.set(p, el); else canvases.current.delete(p);
  }, []);

  // ---- pdf render -------------------------------------------------------
  const renderTextLayer = useCallback(async (p: number) => {
    const doc = pdfDoc.current;
    const container = document.querySelector<HTMLElement>(`[data-text-layer="${p}"]`);
    if (!doc || !container) return;
    const leafW = container.parentElement?.clientWidth ?? 0;
    if (!leafW) return;
    try {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const scale = leafW / base.width;
      container.replaceChildren();
      container.style.setProperty("--scale-factor", String(scale));
      container.style.setProperty("--total-scale-factor", String(scale));
      const tl = new pdfjsLib.TextLayer({
        textContentSource: await page.getTextContent(),
        container,
        viewport: page.getViewport({ scale }),
      });
      await tl.render();
    } catch {}
  }, []);

  const renderPage = useCallback(async (p: number) => {
    const doc = pdfDoc.current;
    const canvas = canvases.current.get(p);
    if (!doc || !canvas || renderedSet.current.has(p)) return;
    renderedSet.current.add(p);
    const imgKey = `${location.origin}/__pdfimg-v1/${encodeURIComponent(storageKey)}/${p}-${RENDER_W}`;
    try {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: RENDER_W / base.width });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // fast path: paint a previously cached bitmap (no re-rasterizing the PDF)
      let painted = false;
      try {
        const cache = await caches.open("a365-img-v1");
        const hit = await cache.match(imgKey);
        if (hit) {
          const bmp = await createImageBitmap(await hit.blob());
          ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          bmp.close?.();
          painted = true;
        }
      } catch { /* no cache / no createImageBitmap → render below */ }
      if (!painted) {
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        // stash the rendered page so the next open paints instantly
        try {
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
          if (blob) { const cache = await caches.open("a365-img-v1"); await cache.put(imgKey, new Response(blob)); }
        } catch {}
      }
    } catch { renderedSet.current.delete(p); }
    renderTextLayer(p);
  }, [storageKey, renderTextLayer]);

  // render pages as they approach the viewport; also fill the rest as a backup
  useEffect(() => {
    if (phase !== "ready" || !pageCount) return;
    const stage = scrollRef.current;
    if (!stage) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) renderPage(Number((e.target as HTMLElement).dataset.page));
    }, { root: stage, rootMargin: "1000px 0px" });
    stage.querySelectorAll<HTMLElement>(".scroll-page").forEach((el) => io.observe(el));
    const fill = setTimeout(async () => { for (let p = 1; p <= pageCount; p++) await renderPage(p); }, 700);
    return () => { io.disconnect(); clearTimeout(fill); };
  }, [phase, pageCount, renderPage]);

  // rebuild text layers when the page width changes (zoom / window resize)
  useEffect(() => {
    if (phase !== "ready") return;
    let tmr: ReturnType<typeof setTimeout>;
    const rebuild = () => { clearTimeout(tmr); tmr = setTimeout(() => { renderedSet.current.forEach((p) => renderTextLayer(p)); }, 160); };
    rebuild();
    window.addEventListener("resize", rebuild);
    return () => { clearTimeout(tmr); window.removeEventListener("resize", rebuild); };
  }, [phase, zoom, renderTextLayer]);

  // track which page is centred, for the label + progress bar
  useEffect(() => {
    if (phase !== "ready") return;
    const stage = scrollRef.current;
    if (!stage) return;
    const onScroll = () => {
      const sr = stage.getBoundingClientRect();
      const midY = sr.top + sr.height / 2;
      let best = 1, bd = Infinity;
      stage.querySelectorAll<HTMLElement>(".scroll-page").forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - midY);
        if (d < bd) { bd = d; best = Number(el.dataset.page); }
      });
      setActivePage(best);
    };
    stage.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { stage.removeEventListener("scroll", onScroll); };
  }, [phase, pageCount]);

  // ---- highlight overlay (imperative) -----------------------------------
  const redrawPage = useCallback((n: number, map: HlMap) => {
    const layer = document.querySelector<HTMLElement>(`[data-hl-layer="${n}"]`);
    if (!layer) return;
    const items = map[n] ?? [];
    layer.innerHTML = items.map((h) =>
      `<div style="position:absolute;left:${h.x * 100}%;top:${h.y * 100}%;width:${h.w * 100}%;height:${h.h * 100}%;background:${HL_RGBA[h.color]};border-radius:2px;mix-blend-mode:multiply;pointer-events:none"></div>`
    ).join("");
  }, []);
  useEffect(() => {
    if (phase !== "ready") return;
    for (let p = 1; p <= pageCount; p++) redrawPage(p, highlights);
  }, [highlights, phase, pageCount, redrawPage]);

  // turn the current text selection into highlight rects (per page)
  const commitSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const rects = Array.from(sel.getRangeAt(0).getClientRects());
    const additions: { page: number; x: number; y: number; w: number; h: number }[] = [];
    for (const rc of rects) {
      if (rc.width < 3 || rc.height < 3) continue;
      const el = document
        .elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2)
        ?.closest<HTMLElement>(".page-pdf");
      if (!el) continue;
      const pr = el.getBoundingClientRect();
      additions.push({
        page: Number(el.dataset.page),
        x: clamp01((rc.left - pr.left) / pr.width),
        y: clamp01((rc.top - pr.top) / pr.height),
        w: rc.width / pr.width,
        h: rc.height / pr.height,
      });
    }
    if (!additions.length) return;
    const covered = (a: { x: number; y: number; w: number; h: number }, h: Hl) => {
      const ix = Math.max(0, Math.min(a.x + a.w, h.x + h.w) - Math.max(a.x, h.x));
      const iy = Math.max(0, Math.min(a.y + a.h, h.y + h.h) - Math.max(a.y, h.y));
      const area = a.w * a.h;
      return area > 0 ? (ix * iy) / area : 0;
    };
    setHighlights((prev) => {
      const next: HlMap = { ...prev };
      for (const a of additions) {
        const existing = next[a.page] ?? [];
        if (existing.some((h) => covered(a, h) > 0.5)) continue; // already highlighted → skip
        next[a.page] = [...existing, { id: uid(), x: a.x, y: a.y, w: a.w, h: a.h, color: hlColorRef.current }];
      }
      save(next); return next;
    });
    sel.removeAllRanges();
  }, [save]);

  const clearAll = () => { setHighlights({}); save({}); };

  const applyZoom = useCallback((nz: number) => {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +nz.toFixed(2))));
  }, []);

  const toggleFs = () => {
    if (document.fullscreenElement) { document.exitFullscreen(); setFs(false); }
    else { document.documentElement.requestFullscreen?.(); setFs(true); }
  };

  const onPointerUp = () => { if (hlModeRef.current) setTimeout(commitSelection, 0); };
  const onWheel = (e: React.WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)); };

  const pageWidth = `calc(min(880px, 94vw) * ${zoom})`;

  return (
    <div className={cn("reader-desk flex h-dvh flex-col", hlMode && "hl")}>
      <header className="z-30 flex h-14 items-center gap-2 border-b border-white/10 px-3 text-zinc-200 sm:px-4">
        <Link href="/books" aria-label="Back" className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-[11px] text-zinc-400">Page {activePage} of {pageCount || "—"} · {pct}%</p>
        </div>
        <button onClick={toggleFs} aria-label="Fullscreen" className="hidden size-9 place-items-center rounded-xl hover:bg-white/10 sm:grid">
          {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
        <Link href="/books" aria-label="Exit" className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><X className="size-5" /></Link>
      </header>

      <div className="h-0.5 w-full bg-white/10"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>

      <div
        ref={scrollRef}
        className={cn("relative flex-1 overflow-auto reader-scroll", hlMode && "cursor-text")}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        {phase === "loading" && <Center><Loader2 className="size-7 animate-spin text-primary" /><p className="text-sm text-zinc-400">Opening the issue…</p></Center>}
        {phase === "error" && (
          <Center>
            <Logo size={52} showWordmark={false} href={null} />
            <p className="mt-4 text-sm text-zinc-300">Couldn&apos;t open this issue.</p>
            <Link href="/books" className="btn-brand mt-5 inline-block rounded-xl px-4 py-2 text-sm">Back to books</Link>
          </Center>
        )}
        {phase === "ready" && pageCount > 0 && (
          <div className="mx-auto flex w-max flex-col items-center gap-4 px-2 py-4 sm:gap-6 sm:py-6">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                data-page={p}
                className="scroll-page page-pdf reader-page"
                style={{ width: pageWidth, aspectRatio: String(aspect) }}
              >
                <canvas ref={(el) => registerCanvas(p, el)} className="pdf-canvas" />
                <div className="wm-layer" style={{ backgroundImage: WM_BG }} />
                <div className="textLayer" data-text-layer={p} />
                <div className="hl-layer" data-hl-layer={p} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls — zoom + highlighter (scroll to read; no page turning) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 px-2 py-2 text-zinc-200 sm:gap-2 sm:px-3 sm:py-2.5">
        <button onClick={() => applyZoom(zoom - ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" className="grid size-9 place-items-center rounded-xl border border-white/15 hover:bg-white/10 disabled:opacity-40"><Minus className="size-4" /></button>
        <span className="w-12 text-center text-xs text-zinc-400 tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => applyZoom(zoom + ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" className="grid size-9 place-items-center rounded-xl border border-white/15 hover:bg-white/10 disabled:opacity-40"><Plus className="size-4" /></button>
        <button onClick={() => applyZoom(1)} aria-label="Fit" className="grid size-9 place-items-center rounded-xl border border-white/15 hover:bg-white/10"><Scan className="size-4" /></button>

        <span className="mx-1 h-6 w-px bg-white/15" />
        <button
          onClick={() => setHlMode((v) => !v)}
          className={cn("grid size-9 place-items-center rounded-xl border transition-colors", hlMode ? "border-primary/60 bg-primary/20 text-primary" : "border-white/15 hover:bg-white/10")}
          aria-label="Highlighter"
          title="Highlighter — select text to highlight it"
        ><Highlighter className="size-4" /></button>
        {hlMode && (
          <>
            {HL_COLORS.map((c) => (
              <button key={c} onClick={() => setHlColor(c)} aria-label={c}
                className={cn("size-6 rounded-full ring-1 ring-black/30 transition", HL_DOT[c], hlColor === c && "ring-2 ring-primary")} />
            ))}
            <button onClick={clearAll} className="grid size-9 place-items-center rounded-xl border border-white/15 text-red-300 hover:bg-white/10" aria-label="Clear highlights" title="Clear all highlights"><Eraser className="size-4" /></button>
          </>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center"><div className="flex flex-col items-center gap-3 text-center">{children}</div></div>;
}
