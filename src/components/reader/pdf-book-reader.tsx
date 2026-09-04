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

type HlMap = Record<number, Hl[]>;

export function PdfBookReader({
  pdfUrl, title, storageKey,
}: { pdfUrl: string; title: string; storageKey: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [pageCount, setPageCount] = useState(0);
  const [flip, setFlip] = useState(0);
  const [fs, setFs] = useState(false);
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 700 ? 1 : 1.5));
  const [tx, setTx] = useState(0); // horizontal translate to keep content centered
  // small screens: one page per screen (a 2-page spread is unreadable on a phone)
  const [portrait, setPortrait] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);

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
  const highlightsRef = useRef(highlights); useEffect(() => { highlightsRef.current = highlights; }, [highlights]);

  // track the portrait/landscape breakpoint; flipbook remounts when it flips
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 699px)");
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // reset zoom/pan to a sensible fit whenever the orientation mode changes
  useEffect(() => { setZoom(portrait ? 1 : 1.5); setTx(0); }, [portrait]);

  const key = `a365.pdfhl.${storageKey}`;

  // leaf order: front cover (page 1) + spreads; total must be even for showCover,
  // so append a blank "back cover" if needed (page 1 stays a centered cover).
  const leaves: (number | null)[] = [];
  for (let p = 1; p <= pageCount; p++) leaves.push(p);

  const displayPage = leaves[flip] ?? leaves[Math.max(0, flip - 1)] ?? 1;
  const pct = pageCount ? Math.round((displayPage / pageCount) * 100) : 0;
  const canPrev = flip > 0;
  // landscape advances a spread (2 pages), portrait advances a single page
  const canNext = flip < pageCount - (portrait ? 1 : 2);

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
        // the book never re-downloads the 10 MB PDF (instant on later visits).
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
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // pre-render every page (sequentially, in the background) so flipping never
  // shows a blank white page while the target canvas rasterizes.
  const renderAll = useCallback(async () => {
    const n = pdfDoc.current?.numPages ?? 0;
    for (let p = 1; p <= n; p++) await renderPage(p);
  }, [renderPage]);

  useEffect(() => {
    if (phase !== "ready") return;
    renderWindow(1);
    const t = setTimeout(renderAll, 400); // backup in case the flipbook onInit is missed
    return () => clearTimeout(t);
  }, [phase, renderWindow, renderAll]);

  useEffect(() => {
    if (phase !== "ready") return;
    let tmr: ReturnType<typeof setTimeout>;
    const onR = () => { clearTimeout(tmr); tmr = setTimeout(() => { renderedSet.current.forEach((p) => renderTextLayer(p)); }, 200); };
    window.addEventListener("resize", onR);
    return () => { clearTimeout(tmr); window.removeEventListener("resize", onR); };
  }, [phase, renderTextLayer]);

  // Block page-flip's drag while highlighting or zoomed (it listens on an
  // ancestor, so we stop the event at the page — flip off, selection/pan stay).
  // A MutationObserver re-attaches to freshly created .page nodes so this keeps
  // working after an orientation remount (otherwise page-flip grabs the
  // mousedown that starts a text selection → highlighting silently breaks).
  useEffect(() => {
    if (phase !== "ready") return;
    const stop = (e: Event) => {
      if (hlModeRef.current || zoomRef.current > 1) e.stopPropagation();
    };
    const evs = ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"] as const;
    const bound = new WeakSet<HTMLElement>();
    const attach = () => {
      document.querySelectorAll<HTMLElement>(".flip-book .page").forEach((p) => {
        if (bound.has(p)) return;
        bound.add(p);
        evs.forEach((ev) => p.addEventListener(ev, stop));
      });
    };
    attach();
    const t1 = setTimeout(attach, 300), t2 = setTimeout(attach, 900);
    const mo = new MutationObserver(attach);
    if (stageRef.current) mo.observe(stageRef.current, { childList: true, subtree: true });
    return () => {
      clearTimeout(t1); clearTimeout(t2); mo.disconnect();
      document.querySelectorAll<HTMLElement>(".flip-book .page").forEach((p) => evs.forEach((ev) => p.removeEventListener(ev, stop)));
    };
  }, [phase]);

  // showCover forces the cover pages to "hard" — keep every page soft so they
  // all curl the same. Re-applied before each flip since the lib re-sets it.
  const softenAll = useCallback(() => {
    try {
      const api = bookRef.current?.pageFlip() as unknown as {
        getPageCollection?: () => { getPages?: () => Array<{ setDensity?: (d: string) => void; setDrawingDensity?: (d: string) => void }> };
      };
      api?.getPageCollection?.().getPages?.().forEach((pg) => {
        pg.setDensity?.("soft");
        pg.setDrawingDensity?.("soft");
      });
    } catch {}
  }, []);

  const handleInit = useCallback(() => {
    renderWindow(1);            // current spread first (fast first paint)
    softenAll();
    setTimeout(renderAll, 150); // then fill the rest in the background → no white flash on flip
  }, [renderWindow, softenAll, renderAll]);
  const registerCanvas = useCallback((p: number, el: HTMLCanvasElement | null) => {
    if (el) {
      // a fresh canvas (e.g. after an orientation remount) is blank → re-render it
      if (canvases.current.get(p) !== el) renderedSet.current.delete(p);
      canvases.current.set(p, el);
    } else canvases.current.delete(p);
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
    // slight delay so a remounted flipbook has committed its fresh hl-layers
    const t = setTimeout(() => { for (let p = 1; p <= pageCount; p++) redrawPage(p, highlights); }, portrait ? 60 : 0);
    return () => clearTimeout(t);
  }, [highlights, phase, pageCount, redrawPage, portrait]);

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
    // overlap ratio of `a` covered by existing highlight `h`
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

  // ---- flip / zoom ------------------------------------------------------
  // center the currently visible page(s) — solo cover or spread
  const centerContent = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (zoomRef.current >= 2) { setTx(0); return; } // single-page pan mode
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

  // at >=200% zoom, snap the view to a single (left) page
  const scrollToOnePage = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    const vis = Array.from(document.querySelectorAll<HTMLElement>(".flip-book .page"))
      .map((p) => p.getBoundingClientRect())
      .filter((r) => r.width > 4 && r.bottom > sr.top && r.top < sr.bottom && r.right > sr.left && r.left < sr.right);
    if (!vis.length) return;
    vis.sort((a, b) => a.left - b.left);
    stage.scrollTop = 0;
    stage.scrollLeft += vis[0].left - sr.left;
  }, []);

  const onFlip = useCallback((e: { data: number }) => {
    setFlip(e.data);
    renderWindow(Math.min(e.data + 1, pageCount || 1));
    setTimeout(centerContent, 760);
    setTimeout(() => { if (zoomRef.current >= 2) scrollToOnePage(); }, 800);
    setTimeout(softenAll, 40); // keep upcoming flips (incl. covers) soft
  }, [renderWindow, pageCount, centerContent, softenAll, scrollToOnePage]);

  useEffect(() => {
    if (phase !== "ready") return;
    const t = setTimeout(centerContent, 500);
    return () => clearTimeout(t);
  }, [phase, centerContent]);
  const syncFlip = useCallback(() => {
    try {
      const i = (bookRef.current?.pageFlip() as unknown as { getCurrentPageIndex?: () => number })?.getCurrentPageIndex?.();
      if (typeof i === "number") setFlip(i);
    } catch {}
  }, []);
  // sample the real engine index across the whole flip window so `flip`
  // (→ label + canPrev/canNext) never goes stale, whatever the flip speed.
  // setFlip with an unchanged value is a no-op, so this adds no re-render churn.
  const pollFlip = useCallback(() => { [120, 360, 720, 1050, 1450].forEach((t) => setTimeout(syncFlip, t)); }, [syncFlip]);
  // soften synchronously BEFORE flipping: start() reads density on invoke and
  // forces the cover to "hard" if it mismatches its neighbor. Soft==soft = curl.
  const next = useCallback(() => { try { softenAll(); bookRef.current?.pageFlip().flipNext(); pollFlip(); } catch {} }, [pollFlip, softenAll]);
  const prev = useCallback(() => { try { softenAll(); bookRef.current?.pageFlip().flipPrev(); pollFlip(); } catch {} }, [pollFlip, softenAll]);
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
        if (clamped >= 2) {
          setTimeout(scrollToOnePage, 230);
        } else {
          const cx = st.scrollLeft + st.clientWidth / 2, cy = st.scrollTop + st.clientHeight / 2, r = clamped / old;
          const recenter = () => { st.scrollLeft = cx * r - st.clientWidth / 2; st.scrollTop = cy * r - st.clientHeight / 2; };
          requestAnimationFrame(recenter);
          setTimeout(recenter, 210);
        }
        setTimeout(centerContent, 240);
      }
      return clamped;
    });
  }, [centerContent, scrollToOnePage]);

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
    } else if (!hlModeRef.current) {
      // drag-to-flip mode: soften first so a dragged cover-open curls like a page
      softenAll();
    }
  };
  const onMoveCapture = (e: React.PointerEvent) => {
    if (pan.current.active && stageRef.current) {
      e.stopPropagation();
      stageRef.current.scrollTop = pan.current.st - (e.clientY - pan.current.y);
      // horizontal pan only in single-page (>=200%) mode
      if (zoomRef.current >= 2) stageRef.current.scrollLeft = pan.current.sl - (e.clientX - pan.current.x);
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
        className={cn("relative flex-1 no-scrollbar", zoom >= 2 ? "overflow-auto" : zoom > 1 ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden", hlMode && "cursor-text")}
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
          <div className="grid h-full place-items-center p-1.5 sm:p-3" style={{ transform: `translateX(${zoom >= 2 ? 0 : tx}px) scale(${zoom})`, transformOrigin: zoom >= 2 ? "0 0" : "50% 0", transition: "transform 0.18s ease" }}>
            <BookPages leaves={leaves} flipRef={bookRef} onFlip={onFlip} onInit={handleInit} registerCanvas={registerCanvas} portrait={portrait} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 px-2 py-2 text-zinc-200 sm:gap-2 sm:px-3 sm:py-2.5">
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
  portrait: boolean;
}
const BookPages = memo(function BookPages({ leaves, flipRef, onFlip, onInit, registerCanvas, portrait }: BookPagesProps) {
  const wmBg = watermarkUrl(WATERMARK_TEXT);
  return (
    <div className="flip-wrap">
      <HTMLFlipBook
        key={portrait ? "portrait" : "landscape"}
        ref={flipRef}
        width={520} height={672} size="stretch"
        minWidth={280} maxWidth={780} minHeight={360} maxHeight={1010}
        startPage={0} startZIndex={0} autoSize={false}
        drawShadow flippingTime={700} usePortrait={portrait} maxShadowOpacity={0.5}
        showCover mobileScrollSupport={false}
        clickEventForward={false} useMouseEvents swipeDistance={30}
        showPageCorners disableFlipByClick={false}
        style={{}} className="flip-book" onFlip={onFlip} onInit={onInit}
      >
        {leaves.map((p, i) =>
          p === null ? (
            <div className="page page-blank-leaf" key={`b-${i}`} data-density="soft" />
          ) : (
            <div className="page page-pdf" data-page={p} key={p} data-density="soft">
              <canvas ref={(el) => registerCanvas(p, el)} className="pdf-canvas" />
              <div className="wm-layer" style={{ backgroundImage: wmBg }} />
              <div className="textLayer" data-text-layer={p} />
              <div className="hl-layer" data-hl-layer={p} />
            </div>
          )
        )}
      </HTMLFlipBook>
    </div>
  );
});
