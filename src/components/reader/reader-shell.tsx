"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark, ChevronLeft, ChevronRight, List, Maximize, Minimize,
  Minus, Plus, Search, Settings2, StickyNote, X,
} from "lucide-react";
import type { ReaderManifest } from "@/services/reader.api";
import { readerApi } from "@/services/reader.api";
import { ReaderWatermark } from "./reader-watermark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/input";
import { useAnnotations } from "@/stores/annotations";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { cn } from "@/lib/utils";
import type { HighlightColor, ReaderTheme, TocItem } from "@/types";

const HL_COLORS: HighlightColor[] = ["yellow", "orange", "green", "blue", "pink"];
const HL_BG: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400", orange: "bg-orange-400", green: "bg-green-400", blue: "bg-blue-400", pink: "bg-pink-400",
};

type LeftTab = "toc" | "bookmarks" | "highlights" | "notes";
type RightMode = "search" | "notes" | "settings" | "highlight" | null;

interface SelMenu { x: number; y: number; text: string; }

export function ReaderShell({ manifest }: { manifest: ReaderManifest }) {
  const { book, content, watermark } = manifest;
  const router = useRouter();
  const params = useSearchParams();

  const prefs = useReaderPrefs();
  const ann = useAnnotations();

  const totalPages = content.pageCount;
  const initial = Math.min(Math.max(Number(params.get("p")) || book.lastPage || 1, 1), totalPages);
  const [page, setPageState] = useState(initial);
  const [left, setLeft] = useState<LeftTab | null>(null);
  const [right, setRight] = useState<RightMode>(null);
  const [sel, setSel] = useState<SelMenu | null>(null);
  const [activeHl, setActiveHl] = useState<string | null>(null);
  const [fs, setFs] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(page);
  const [w, setW] = useState(0);
  const [trackX, setTrackX] = useState<number | null>(null);
  const [instant, setInstant] = useState(false);
  const pending = useRef<null | "next" | "prev">(null);
  const drag = useRef({ x: 0, y: 0, active: false, armed: false });

  const pct = Math.round((page / totalPages) * 100);
  const bookHighlights = ann.highlights.filter((h) => h.bookId === book.id);
  const bookmarked = ann.bookmarks.some((b) => b.bookId === book.id && b.page === page);
  const pageData = useCallback(
    (n: number) => content.pages.find((p) => p.page === n),
    [content.pages]
  );

  // measure viewport width for the slide track
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const ww = el.clientWidth;
      setW(ww);
      setTrackX((x) => (x === null ? -ww : x));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyPage = useCallback(
    (np: number) => {
      const clamped = Math.min(Math.max(np, 1), totalPages);
      pageRef.current = clamped;
      setPageState(clamped);
      setSel(null);
      prefs.setProgress(book.id, clamped);
    },
    [totalPages, prefs, book.id]
  );

  // animated turn (used by drag release, arrows, page buttons)
  const turn = useCallback(
    (delta: 1 | -1) => {
      const cur = pageRef.current;
      if (delta > 0 && cur >= totalPages) { setInstant(false); setTrackX(-w); return; }
      if (delta < 0 && cur <= 1) { setInstant(false); setTrackX(-w); return; }
      pending.current = delta > 0 ? "next" : "prev";
      setInstant(false);
      setTrackX(delta > 0 ? -2 * w : 0);
    },
    [totalPages, w]
  );

  // instant jump to arbitrary page (TOC / search / bookmark)
  const jump = useCallback(
    (p: number) => {
      setInstant(true);
      applyPage(p);
      setTrackX(-w);
      requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    },
    [applyPage, w]
  );

  const onTrackDone = useCallback(() => {
    const k = pending.current;
    if (!k) return;
    pending.current = null;
    setInstant(true);
    applyPage(pageRef.current + (k === "next" ? 1 : -1));
    setTrackX(-w);
    requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
  }, [applyPage, w]);

  // ---- drag-to-slide pointer handlers ----------------------------------
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea")) return;
    drag.current = { x: e.clientX, y: e.clientY, active: true, armed: false };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.armed) {
        const s = window.getSelection();
        const canArm = !s || s.isCollapsed;
        if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3 && canArm) {
          d.armed = true;
          setInstant(true);
          try { viewportRef.current?.setPointerCapture(e.pointerId); } catch {}
        } else if (Math.abs(dy) > 16) {
          d.active = false;
          return;
        }
      }
      if (d.armed) {
        e.preventDefault();
        let dd = dx;
        if (pageRef.current >= totalPages && dd < 0) dd *= 0.28;
        if (pageRef.current <= 1 && dd > 0) dd *= 0.28;
        setTrackX(-w + dd);
      }
    },
    [totalPages, w]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      d.active = false;
      if (!d.armed) return;
      d.armed = false;
      const dx = e.clientX - d.x;
      const T = Math.max(80, w * 0.16);
      if (dx <= -T) turn(1);
      else if (dx >= T) turn(-1);
      else { setInstant(false); setTrackX(-w); }
    },
    [w, turn]
  );

  // keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") turn(1);
      if (e.key === "ArrowLeft") turn(-1);
      if (e.key === "Escape") { setLeft(null); setRight(null); setSel(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // block copy / context menu in the reader
  const block = useCallback((e: React.SyntheticEvent) => e.preventDefault(), []);

  // fullscreen
  const toggleFs = () => {
    if (document.fullscreenElement) { document.exitFullscreen(); setFs(false); }
    else { document.documentElement.requestFullscreen?.(); setFs(true); }
  };

  // selection → highlight toolbar
  const onMouseUp = useCallback(() => {
    const s = window.getSelection();
    if (!s || s.isCollapsed) { setSel(null); return; }
    const text = s.toString().trim();
    if (text.length < 3) { setSel(null); return; }
    const range = s.getRangeAt(0);
    const el = (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer as Element)?.closest("[data-p]");
    if (!el || !el.contains(range.endContainer.nodeType === 3 ? range.endContainer.parentElement : range.endContainer)) { setSel(null); return; }
    const r = range.getBoundingClientRect();
    setSel({ x: r.left + r.width / 2, y: r.top, text });
  }, []);

  const addHighlight = (color: HighlightColor, withNote = false) => {
    if (!sel) return;
    const item = ann.addHighlight({ bookId: book.id, bookTitle: book.title, page, color, text: sel.text });
    window.getSelection()?.removeAllRanges();
    setSel(null);
    if (withNote) {
      ann.addNote({ bookId: book.id, bookTitle: book.title, page, content: "", quote: item.text });
      setRight("notes");
    }
  };

  const theme = prefs.theme;
  const themeClass = theme === "light" ? "read-theme-light" : theme === "sepia" ? "read-theme-sepia" : "read-theme-dark";
  const maxW = prefs.fit === "page" ? "max-w-xl" : "max-w-3xl";

  return (
    <div className={cn("relative flex h-dvh flex-col overflow-hidden", themeClass)} style={{ background: "var(--page-bg)", color: "var(--page-fg)" }}>
      {/* TOP BAR */}
      <header className={cn("z-30 flex h-14 items-center gap-1.5 border-b px-3 transition-transform sm:px-4", chromeHidden && "-translate-y-full")}
        style={{ borderColor: "var(--page-line)", background: "color-mix(in srgb, var(--page-bg) 88%, transparent)" }}>
        <Button asChild variant="ghost" size="icon-sm"><Link href={`/library/${book.id}`} aria-label="Back"><ChevronLeft /></Link></Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{book.title}</p>
          <p className="truncate text-[11px] opacity-60">Page {page} of {totalPages} · {pct}%</p>
        </div>
        <IconBtn label="Contents" active={!!left} onClick={() => setLeft(left ? null : "toc")}><List /></IconBtn>
        <IconBtn label="Search" active={right === "search"} onClick={() => setRight(right === "search" ? null : "search")}><Search /></IconBtn>
        <IconBtn label="Bookmark" active={bookmarked} onClick={() => ann.toggleBookmark(book.id, book.title, page)}><Bookmark className={bookmarked ? "fill-current" : ""} /></IconBtn>
        <IconBtn label="Notes" active={right === "notes"} onClick={() => setRight(right === "notes" ? null : "notes")}><StickyNote /></IconBtn>
        <IconBtn label="Settings" active={right === "settings"} onClick={() => setRight(right === "settings" ? null : "settings")}><Settings2 /></IconBtn>
        <IconBtn label="Fullscreen" onClick={toggleFs} className="hidden sm:inline-flex">{fs ? <Minimize /> : <Maximize />}</IconBtn>
        <Button asChild variant="ghost" size="icon-sm"><Link href="/library" aria-label="Exit"><X /></Link></Button>
      </header>

      {/* thin progress under top bar */}
      <div className="h-0.5 w-full" style={{ background: "var(--page-line)" }}>
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* READING AREA — drag a page to turn (follows the cursor, snaps on release) */}
      <div
        ref={viewportRef}
        className="relative flex-1 touch-pan-y overflow-hidden"
        onMouseUp={onMouseUp}
        onCopy={block}
        onContextMenu={block}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-p], mark, button, a")) return;
          if (window.innerWidth < 1024) setChromeHidden((v) => !v);
        }}
      >
        <ReaderWatermark line1={watermark.line1} line2={watermark.line2} page={page} />
        {w > 0 && (
          <motion.div
            className="relative z-10 flex h-full"
            style={{ width: w * 3 }}
            animate={{ x: trackX ?? -w }}
            transition={instant ? { duration: 0 } : { type: "tween", duration: 0.34, ease: "easeOut" }}
            onAnimationComplete={onTrackDone}
          >
            {[page - 1, page, page + 1].map((n) => {
              const pg = pageData(n);
              return (
                <div key={n} className="h-full shrink-0 overflow-y-auto" style={{ width: w }}>
                  {pg && (
                    <article
                      className={cn("mx-auto px-5 py-10 sm:px-8 sm:py-14", maxW)}
                      style={{ fontSize: `${prefs.zoom}rem` }}
                    >
                      {pg.heading && (
                        <h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                          {pg.heading}
                        </h2>
                      )}
                      <div className="space-y-5 font-serif text-[1.05em] leading-[1.85]" style={{ fontFamily: "var(--font-serif)" }}>
                        {pg.paragraphs.map((para, i) => (
                          <p key={i} data-p={i}>
                            {renderParagraph(para, bookHighlights.filter((h) => h.page === n), (id, e) => {
                              e.stopPropagation();
                              setActiveHl(id); setRight("highlight");
                            })}
                          </p>
                        ))}
                      </div>
                      <div className="mt-12 flex items-center justify-between border-t pt-5 text-sm opacity-60" style={{ borderColor: "var(--page-line)" }}>
                        <span>{book.author}</span>
                        <span>{n} / {totalPages}</span>
                      </div>
                    </article>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* BOTTOM FLOATING TOOLBAR */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-all", chromeHidden && "translate-y-24 opacity-0")}>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1.5 shadow-2xl backdrop-blur"
          style={{ borderColor: "var(--page-line)", background: "color-mix(in srgb, var(--page-bg) 82%, transparent)" }}>
          <ToolBtn onClick={() => turn(-1)} disabled={page <= 1}><ChevronLeft className="size-4" /></ToolBtn>
          <div className="flex items-center gap-1 px-2 text-xs tabular-nums">
            <input
              type="number" value={page} min={1} max={totalPages}
              onChange={(e) => jump(Number(e.target.value))}
              className="w-10 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: "var(--page-fg)" }}
            />
            <span className="opacity-50">/ {totalPages}</span>
          </div>
          <ToolBtn onClick={() => turn(1)} disabled={page >= totalPages}><ChevronRight className="size-4" /></ToolBtn>
          <span className="mx-1 h-5 w-px" style={{ background: "var(--page-line)" }} />
          <ToolBtn onClick={prefs.zoomOut}><Minus className="size-4" /></ToolBtn>
          <span className="w-10 text-center text-xs tabular-nums opacity-70">{Math.round(prefs.zoom * 100)}%</span>
          <ToolBtn onClick={prefs.zoomIn}><Plus className="size-4" /></ToolBtn>
          <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--page-line)" }} />
          <ToolBtn onClick={() => prefs.setFit("width")} active={prefs.fit === "width"} className="hidden px-2 text-[11px] sm:flex">Width</ToolBtn>
          <ToolBtn onClick={() => prefs.setFit("page")} active={prefs.fit === "page"} className="hidden px-2 text-[11px] sm:flex">Page</ToolBtn>
        </div>
      </div>

      {/* SELECTION HIGHLIGHT TOOLBAR */}
      {sel && (
        <div className="fixed z-50 -translate-x-1/2 -translate-y-full" style={{ left: Math.min(Math.max(sel.x, 130), (typeof window !== "undefined" ? window.innerWidth : 400) - 130), top: sel.y - 8 }}
          onMouseDown={(e) => e.preventDefault()}>
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 shadow-2xl">
            {HL_COLORS.map((c) => (
              <button key={c} onClick={() => addHighlight(c)} className={cn("size-5 rounded-full ring-1 ring-black/40 transition hover:scale-110", HL_BG[c])} title={c} />
            ))}
            <span className="mx-0.5 h-5 w-px bg-zinc-700" />
            <button onClick={() => addHighlight("yellow", true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-white/10">
              <StickyNote className="size-3.5" /> Note
            </button>
          </div>
        </div>
      )}

      {/* LEFT PANEL */}
      {left && (
        <Panel side="left" onClose={() => setLeft(null)}>
          <LeftPanel tab={left} setTab={setLeft} toc={content.toc} page={page}
            book={book} onGoto={(p) => { jump(p); if (window.innerWidth < 1024) setLeft(null); }} />
        </Panel>
      )}

      {/* RIGHT PANEL */}
      {right && (
        <Panel side="right" onClose={() => setRight(null)}>
          <RightPanel mode={right} book={book} page={page} activeHl={activeHl}
            onGoto={(p) => { jump(p); if (window.innerWidth < 1024) setRight(null); }} />
        </Panel>
      )}
    </div>
  );
}

/* ---------- helpers & sub-components ------------------------------------ */

function renderParagraph(
  text: string,
  hls: { id: string; text: string; color: HighlightColor }[],
  onClick: (id: string, e: React.MouseEvent) => void
) {
  if (!hls.length) return text;
  const marks = hls
    .map((h) => ({ h, idx: text.indexOf(h.text) }))
    .filter((m) => m.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  const out: React.ReactNode[] = [];
  let cur = 0;
  for (const m of marks) {
    if (m.idx < cur) continue;
    if (m.idx > cur) out.push(text.slice(cur, m.idx));
    out.push(
      <mark key={m.h.id} data-hl={m.h.color} onClick={(e) => onClick(m.h.id, e)}>
        {text.slice(m.idx, m.idx + m.h.text.length)}
      </mark>
    );
    cur = m.idx + m.h.text.length;
  }
  if (cur < text.length) out.push(text.slice(cur));
  return out;
}

function IconBtn({ children, label, active, onClick, className }: { children: React.ReactNode; label: string; active?: boolean; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className={cn("grid size-9 place-items-center rounded-lg transition-colors [&_svg]:size-[18px]", active ? "bg-primary/15 text-primary" : "opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5", className)}>
      {children}
    </button>
  );
}

function ToolBtn({ children, onClick, disabled, active, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("grid h-8 min-w-8 place-items-center rounded-full px-1 text-sm transition-colors disabled:opacity-30", active ? "bg-primary/15 text-primary" : "hover:bg-black/5 dark:hover:bg-white/10", className)}>
      {children}
    </button>
  );
}

function Panel({ side, onClose, children }: { side: "left" | "right"; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/30 lg:bg-transparent" onClick={onClose} />
      <aside className={cn("absolute top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-border shadow-2xl", side === "left" ? "left-0 border-r" : "right-0 border-l")}
        style={{ background: "var(--page-bg)", borderColor: "var(--page-line)" }}>
        {children}
      </aside>
    </>
  );
}

function LeftPanel({ tab, setTab, toc, page, book, onGoto }: {
  tab: LeftTab; setTab: (t: LeftTab) => void; toc: TocItem[]; page: number;
  book: ReaderManifest["book"]; onGoto: (p: number) => void;
}) {
  const ann = useAnnotations();
  const tabs: { k: LeftTab; label: string }[] = [
    { k: "toc", label: "Contents" }, { k: "bookmarks", label: "Marks" },
    { k: "highlights", label: "Highlights" }, { k: "notes", label: "Notes" },
  ];
  const bm = ann.bookmarks.filter((b) => b.bookId === book.id).sort((a, b) => a.page - b.page);
  const hl = ann.highlights.filter((h) => h.bookId === book.id);
  const nt = ann.notes.filter((n) => n.bookId === book.id);

  return (
    <>
      <div className="grid grid-cols-4 gap-1 border-b p-2" style={{ borderColor: "var(--page-line)" }}>
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("rounded-lg py-1.5 text-xs font-medium transition-colors", tab === t.k ? "bg-primary/15 text-primary" : "opacity-60 hover:opacity-100")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {tab === "toc" && (
          <ul className="space-y-0.5">
            {toc.map((c) => (
              <li key={c.id}>
                <button onClick={() => onGoto(c.page)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm", page >= c.page ? "" : "opacity-70", "hover:bg-black/5 dark:hover:bg-white/5")}>
                  <span className="pr-2">{c.title}</span><span className="text-xs opacity-50">{c.page}</span>
                </button>
                {c.children?.map((s) => (
                  <button key={s.id} onClick={() => onGoto(s.page)} className="flex w-full items-center justify-between rounded-lg py-1.5 pl-7 pr-3 text-left text-[13px] opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5">
                    <span>{s.title}</span><span className="text-xs opacity-50">{s.page}</span>
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
        {tab === "bookmarks" && (bm.length ? (
          <ul className="space-y-1">{bm.map((b) => (
            <li key={b.id} className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              <button onClick={() => onGoto(b.page)} className="flex-1 text-left">🔖 {b.label ?? `Page ${b.page}`}</button>
              <button onClick={() => ann.removeBookmark(b.id)} className="opacity-0 group-hover:opacity-100"><X className="size-3.5" /></button>
            </li>
          ))}</ul>
        ) : <PanelEmpty>No bookmarks yet.</PanelEmpty>)}
        {tab === "highlights" && (hl.length ? (
          <ul className="space-y-1.5">{hl.map((h) => (
            <li key={h.id} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5">
              <button onClick={() => onGoto(h.page)} className="flex gap-2 text-left text-[13px]">
                <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", HL_BG[h.color])} /><span>{h.text}</span>
              </button>
            </li>
          ))}</ul>
        ) : <PanelEmpty>Select text to highlight.</PanelEmpty>)}
        {tab === "notes" && (nt.length ? (
          <ul className="space-y-1.5">{nt.map((n) => (
            <li key={n.id} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5">
              <button onClick={() => onGoto(n.page)} className="text-left text-[13px]">
                <span className="font-medium">Page {n.page}</span> — {n.content || "(empty note)"}
              </button>
            </li>
          ))}</ul>
        ) : <PanelEmpty>No notes yet.</PanelEmpty>)}
      </div>
    </>
  );
}

function RightPanel({ mode, book, page, activeHl, onGoto }: {
  mode: Exclude<RightMode, null>; book: ReaderManifest["book"]; page: number; activeHl: string | null; onGoto: (p: number) => void;
}) {
  const ann = useAnnotations();
  const prefs = useReaderPrefs();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ page: number; snippet: string; occurrences: number }[]>([]);

  useEffect(() => {
    let on = true;
    if (q.trim().length < 2) { setResults([]); return; }
    readerApi.search(book.id, q).then((r) => on && setResults(r));
    return () => { on = false; };
  }, [q, book.id]);

  const title = mode === "search" ? "Search" : mode === "notes" ? "Notes" : mode === "settings" ? "Reading settings" : "Highlight";
  const pageNotes = ann.notes.filter((n) => n.bookId === book.id && n.page === page);
  const hl = ann.highlights.find((h) => h.id === activeHl);

  return (
    <>
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--page-line)" }}>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "search" && (
          <div>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in book…"
              className="mb-3 h-10 w-full rounded-lg border border-border bg-black/5 px-3 text-sm outline-none focus:border-primary/50 dark:bg-white/5" />
            {q.trim().length >= 2 && <p className="mb-2 text-xs opacity-60">{results.length} results</p>}
            <ul className="space-y-1.5">
              {results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => onGoto(r.page)} className="w-full rounded-lg p-2 text-left hover:bg-black/5 dark:hover:bg-white/5">
                    <p className="text-xs font-medium text-primary">Page {r.page} · {r.occurrences}×</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] opacity-70">{r.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "notes" && (
          <div className="space-y-3">
            <Button size="sm" variant="secondary" className="w-full" onClick={() => ann.addNote({ bookId: book.id, bookTitle: book.title, page, content: "" })}>
              <StickyNote className="size-3.5" /> Add note on page {page}
            </Button>
            {pageNotes.length === 0 && <PanelEmpty>No notes on this page.</PanelEmpty>}
            {pageNotes.map((n) => (
              <div key={n.id} className="rounded-xl border p-3" style={{ borderColor: "var(--page-line)" }}>
                {n.quote && <p className="mb-2 border-l-2 border-primary/50 pl-2 text-xs italic opacity-70">“{n.quote}”</p>}
                <Textarea defaultValue={n.content} placeholder="Write your note…" onBlur={(e) => ann.updateNote(n.id, { content: e.target.value })} className="bg-black/5 dark:bg-white/5" />
                <button onClick={() => ann.removeNote(n.id)} className="mt-1.5 text-xs opacity-60 hover:text-red-400">Delete</button>
              </div>
            ))}
          </div>
        )}

        {mode === "settings" && (
          <div className="space-y-6">
            <SettingGroup label="Theme">
              <div className="grid grid-cols-3 gap-2">
                {(["light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
                  <button key={t} onClick={() => prefs.setTheme(t)}
                    className={cn("rounded-lg border py-2 text-xs capitalize", prefs.theme === t ? "border-primary/50 text-primary" : "opacity-70")} style={{ borderColor: prefs.theme === t ? undefined : "var(--page-line)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label="Page fit">
              <div className="grid grid-cols-2 gap-2">
                {(["width", "page"] as const).map((f) => (
                  <button key={f} onClick={() => prefs.setFit(f)}
                    className={cn("rounded-lg border py-2 text-xs capitalize", prefs.fit === f ? "border-primary/50 text-primary" : "opacity-70")} style={{ borderColor: prefs.fit === f ? undefined : "var(--page-line)" }}>
                    Fit {f}
                  </button>
                ))}
              </div>
            </SettingGroup>
            <SettingGroup label={`Text size · ${Math.round(prefs.zoom * 100)}%`}>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" onClick={prefs.zoomOut}><Minus className="size-4" /></Button>
                <Progress value={((prefs.zoom - 0.8) / 0.8) * 100} className="flex-1" />
                <Button variant="outline" size="icon-sm" onClick={prefs.zoomIn}><Plus className="size-4" /></Button>
              </div>
            </SettingGroup>
          </div>
        )}

        {mode === "highlight" && (hl ? (
          <div className="space-y-4">
            <p className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--page-line)" }}>{hl.text}</p>
            <SettingGroup label="Color">
              <div className="flex gap-2">
                {HL_COLORS.map((c) => (
                  <button key={c} onClick={() => ann.setHighlightColor(hl.id, c)}
                    className={cn("size-7 rounded-full ring-1 ring-black/20", HL_BG[c], hl.color === c && "ring-2 ring-primary")} />
                ))}
              </div>
            </SettingGroup>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onGoto(hl.page)}>Go to page {hl.page}</Button>
            <Button variant="destructive" size="sm" className="w-full" onClick={() => ann.removeHighlight(hl.id)}>Delete highlight</Button>
          </div>
        ) : <PanelEmpty>Select a highlight.</PanelEmpty>)}
      </div>
    </>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">{label}</p>{children}</div>;
}
function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center py-14 text-center text-sm opacity-60">
      <div>{children}</div>
    </div>
  );
}
