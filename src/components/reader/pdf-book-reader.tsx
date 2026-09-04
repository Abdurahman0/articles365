"use client";

import {
  memo, useCallback, useEffect, useRef, useState, type RefObject,
} from "react";
import Link from "next/link";
import HTMLFlipBook from "react-pageflip";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft, Eraser, Highlighter, Loader2, Maximize, Minimize, Minus, Plus, Scan, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (n: number) => void;
}

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
const ZOOM_MIN = 1, ZOOM_MAX = 3, ZOOM_STEP = 0.5;
let uidc = 0;
const uid = () => "h" + Date.now().toString(36) + (uidc++);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type HlMap = Record<number, Hl[]>;

export function PdfBookReader({
  pdfUrl, title, storageKey,
}: { pdfUrl: string; title: string; storageKey: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [flip, setFlip] = useState(0);
  const [fs, setFs] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const [tx, setTx] = useState(0); // horizontal translate to keep content centered

  const [hlMode, setHlMode] = useState(false);
  const [hlColor, setHlColor] = useState<HlColor>("yellow");
  const [highlights, setHighlights] = useState<HlMap>({});

  const bookRef = useRef<{ pageFlip: () => FlipApi } | null>(null);
  const pdfDoc = useRef<PDFDocumentProxy | null>(null);
  const task = useRef<ReturnType<typeof pdfjsLib.getDocument> | null>(null);
  const canvases = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedSet = useRef<Set<number>>(new Set());
  const stageRef = useRef<HTMLDivElement>(null);
  const pan = useRef({ x: 0, y: 0, sl: 0, st: 0, active: false });

  const hlModeRef = useRef(hlMode); useEffect(() => { hlModeRef.current = hlMode; }, [hlMode]);
  const hlColorRef = useRef(hlColor); useEffect(() => { hlColorRef.current = hlColor; }, [hlColor]);
  const zoomRef = useRef(zoom); useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const key = `a365.pdfhl.${storageKey}`;

  // leaf order: front cover (page 1) + spreads; total must be even for showCover,
  // so append a blank "back cover" if needed (page 1 stays a centered cover).
  const leaves: (number | null)[] = [];
  for (let p = 1; p <= pageCount; p++) leaves.push(p);
  if (leaves.length % 2 === 1) leaves.push(null);

  const displayPage = leaves[flip] ?? leaves[Math.max(0, flip - 1)] ?? 1;
  const pct = pageCount ? Math.round((displayPage / pageCount) * 100) : 0;
  const canPrev = flip > 0;
  const canNext = flip < leaves.length - 1;

  // ---- load PDF + saved highlights --------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setHighlights(JSON.parse(raw));
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        const t = pdfjsLib.getDocument({
          url: pdfUrl,
          disableAutoFetch: true, // fetch only the pages we open (range requests)
          disableStream: false,
          rangeChunkSize: 262144,
        });
        task.current = t;
        const doc = await t.promise;
        if (cancelled) { t.destroy(); return; }
        pdfDoc.current = doc;
        setPageCount(doc.numPages);
        setPhase("ready");
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; task.current?.destroy(); };
  }, [pdfUrl, key]);

  const save = useCallback((map: HlMap) => {
    try { localStorage.setItem(key, JSON.stringify(map)); } catch {}
  }, [key]);

  // ---- pdf render -------------------------------------------------------
  const renderPage = useCallback(async (p: number) => {
    const doc = pdfDoc.current;
    const canvas = canvases.current.get(p);
    if (!doc || !canvas || renderedSet.current.has(p)) return;
    renderedSet.current.add(p);
    try {
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: RENDER_W / base.width });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
    } catch { renderedSet.current.delete(p); }
    renderTextLayer(p);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // selectable text overlay via pdf.js TextLayer (rebuilt on resize)
  const renderTextLayer = useCallback(async (p: number) => {
    const doc = pdfDoc.current;
    const canvas = canvases.current.get(p);
    const container = document.querySelector<HTMLElement>(`[data-text-layer="${p}"]`);
    if (!doc || !canvas || !container) return;
    const leafW = (canvas.parentElement as HTMLElement | null)?.clientWidth ?? 0;
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

  // render only the current spread (± prefetch), on demand
  const renderWindow = useCallback((center: number) => {
    const from = Math.max(1, center - 1);
    const to = Math.min(pageCount, center + 2);
    for (let p = from; p <= to; p++) renderPage(p);
  }, [pageCount, renderPage]);

  useEffect(() => {
    if (phase !== "ready") return;
    renderWindow(1);
  }, [phase, renderWindow]);

  useEffect(() => {
    if (phase !== "ready") return;
    let tmr: ReturnType<typeof setTimeout>;
    const onR = () => { clearTimeout(tmr); tmr = setTimeout(() => { renderedSet.current.forEach((p) => renderTextLayer(p)); }, 200); };
    window.addEventListener("resize", onR);
    return () => { clearTimeout(tmr); window.removeEventListener("resize", onR); };
  }, [phase, renderTextLayer]);

  // Block page-flip's drag while highlighting or zoomed (it listens on an
  // ancestor, so we stop the event at the page — flip off, selection/pan stay).
  useEffect(() => {
    if (phase !== "ready") return;
    const stop = (e: Event) => {
      if (hlModeRef.current || zoomRef.current > 1) e.stopPropagation();
    };
    const evs = ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"] as const;
    const attach = () => {
      const pages = Array.from(document.querySelectorAll<HTMLElement>(".flip-book .page"));
      pages.forEach((p) => evs.forEach((ev) => p.addEventListener(ev, stop)));
      return pages;
    };
    const t = setTimeout(() => {
      const pages = attach();
      cleanup = () => pages.forEach((p) => evs.forEach((ev) => p.removeEventListener(ev, stop)));
    }, 300);
    let cleanup = () => {};
    return () => { clearTimeout(t); cleanup(); };
  }, [phase, pageCount]);

  const handleInit = useCallback(() => renderWindow(1), [renderWindow]);
  const registerCanvas = useCallback((p: number, el: HTMLCanvasElement | null) => {
    if (el) canvases.current.set(p, el); else canvases.current.delete(p);
  }, []);

  // ---- highlight overlay (imperative — decoupled from react-pageflip) ----
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
    setHighlights((prev) => {
      const next: HlMap = { ...prev };
      for (const a of additions)
        next[a.page] = [...(next[a.page] ?? []), { id: uid(), x: a.x, y: a.y, w: a.w, h: a.h, color: hlColorRef.current }];
      save(next); return next;
    });
    sel.removeAllRanges();
  }, [save]);

  const clearAll = () => { setHighlights({}); save({}); };

  // ---- flip / zoom ------------------------------------------------------
  // center the currently visible page(s) — solo cover or spread
  const centerContent = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    const stageCenter = sr.left + sr.width / 2;
    let min = Infinity, max = -Infinity;
    document.querySelectorAll<HTMLElement>(".flip-book .page").forEach((p) => {
      const r = p.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < sr.left || cx > sr.right || cy < sr.top || cy > sr.bottom) return; // only on-screen leaves
      min = Math.min(min, r.left);
      max = Math.max(max, r.right);
    });
    if (!isFinite(min)) return;
    const contentCenter = (min + max) / 2;
    const delta = stageCenter - contentCenter;
    if (Math.abs(delta) > 1) setTx((prev) => prev + delta);
  }, []);

  const onFlip = useCallback((e: { data: number }) => {
    setFlip(e.data);
    renderWindow(Math.min(e.data + 1, pageCount || 1));
    setTimeout(centerContent, 760);
  }, [renderWindow, pageCount, centerContent]);

  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(centerContent, 500);
    return () => clearTimeout(t);
  }, [phase, centerContent]);
  const next = useCallback(() => { try { bookRef.current?.pageFlip().flipNext(); } catch {} }, []);
  const prev = useCallback(() => { try { bookRef.current?.pageFlip().flipPrev(); } catch {} }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  const applyZoom = useCallback((nz: number) => {
    const st = stageRef.current;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +nz.toFixed(2)));
    setZoom((old) => {
      if (st && old) {
        const cx = st.scrollLeft + st.clientWidth / 2, cy = st.scrollTop + st.clientHeight / 2, r = clamped / old;
        const recenter = () => { st.scrollLeft = cx * r - st.clientWidth / 2; st.scrollTop = cy * r - st.clientHeight / 2; };
        requestAnimationFrame(recenter);
        setTimeout(recenter, 210);
        setTimeout(centerContent, 240);
      }
      return clamped;
    });
  }, [centerContent]);

  const toggleFs = () => {
    if (document.fullscreenElement) { document.exitFullscreen(); setFs(false); }
    else { document.documentElement.requestFullscreen?.(); setFs(true); }
  };

  // ---- pointer: pan when zoomed (blank areas); text selects freely ------
  const onDownCapture = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // when zoomed (and not highlighting), drag to pan
    if (zoomRef.current > 1 && !hlModeRef.current && stageRef.current && !target.closest(".textLayer span")) {
      e.stopPropagation();
      pan.current = { x: e.clientX, y: e.clientY, sl: stageRef.current.scrollLeft, st: stageRef.current.scrollTop, active: true };
      stageRef.current.setPointerCapture?.(e.pointerId);
    }
  };
  const onMoveCapture = (e: React.PointerEvent) => {
    if (pan.current.active && stageRef.current) {
      e.stopPropagation();
      // vertical pan only
      stageRef.current.scrollTop = pan.current.st - (e.clientY - pan.current.y);
    }
  };
  const onUpCapture = () => {
    pan.current.active = false;
    if (hlModeRef.current) setTimeout(commitSelection, 0);
  };
  const onWheel = (e: React.WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)); };

  return (
    <div className={cn("reader-desk flex h-dvh flex-col", hlMode && "hl", zoom > 1 && "zoomed")}>
      <header className="z-30 flex h-14 items-center gap-2 border-b border-white/10 px-3 text-zinc-200 sm:px-4">
        <Link href="/books" aria-label="Back" className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><ChevronLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-[11px] text-zinc-400">Page {displayPage} of {pageCount || "—"} · {pct}%</p>
        </div>
        <button onClick={toggleFs} aria-label="Fullscreen" className="hidden size-9 place-items-center rounded-xl hover:bg-white/10 sm:grid">
          {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
        <Link href="/books" aria-label="Exit" className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><X className="size-5" /></Link>
      </header>

      <div className="h-0.5 w-full bg-white/10"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>

      <div
        ref={stageRef}
        className={cn("relative flex-1 no-scrollbar", zoom > 1 ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden", hlMode && "cursor-text")}
        onPointerDownCapture={onDownCapture}
        onPointerMoveCapture={onMoveCapture}
        onPointerUpCapture={onUpCapture}
        onPointerCancelCapture={onUpCapture}
        onWheel={onWheel}
        onDoubleClick={() => !hlMode && applyZoom(zoom > 1 ? 1 : 2)}
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
          <div className="grid h-full place-items-center p-1.5 sm:p-3" style={{ transform: `translateX(${tx}px) scale(${zoom})`, transformOrigin: "50% 0", transition: "transform 0.18s ease" }}>
            <BookPages leaves={leaves} flipRef={bookRef} onFlip={onFlip} onInit={handleInit} registerCanvas={registerCanvas} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-2.5 text-zinc-200">
        <button onClick={prev} disabled={!canPrev} className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">← Prev</button>
        <span className="min-w-14 text-center text-xs text-zinc-400 tabular-nums">{displayPage} / {pageCount}</span>
        <button onClick={next} disabled={!canNext} className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">Next →</button>

        <span className="mx-1 h-6 w-px bg-white/15" />
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

interface BookPagesProps {
  leaves: (number | null)[];
  flipRef: RefObject<{ pageFlip: () => FlipApi } | null>;
  onFlip: (e: { data: number }) => void;
  onInit: () => void;
  registerCanvas: (p: number, el: HTMLCanvasElement | null) => void;
}
const BookPages = memo(function BookPages({ leaves, flipRef, onFlip, onInit, registerCanvas }: BookPagesProps) {
  return (
    <div className="flip-wrap">
      <HTMLFlipBook
        ref={flipRef}
        width={520} height={672} size="stretch"
        minWidth={300} maxWidth={780} minHeight={387} maxHeight={1010}
        startPage={0} startZIndex={0} autoSize={false}
        drawShadow flippingTime={700} usePortrait={false} maxShadowOpacity={0.5}
        showCover={false} mobileScrollSupport={false}
        clickEventForward={false} useMouseEvents swipeDistance={30}
        showPageCorners disableFlipByClick
        style={{}} className="flip-book" onFlip={onFlip} onInit={onInit}
      >
        {leaves.map((p, i) =>
          p === null ? (
            <div className="page page-blank-leaf" key={`b-${i}`} data-density="soft" />
          ) : (
            <div className="page page-pdf" data-page={p} key={p} data-density="soft">
              <canvas ref={(el) => registerCanvas(p, el)} className="pdf-canvas" />
              <div className="textLayer" data-text-layer={p} />
              <div className="hl-layer" data-hl-layer={p} />
            </div>
          )
        )}
      </HTMLFlipBook>
    </div>
  );
});
