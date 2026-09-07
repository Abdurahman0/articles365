// Deterministic PDF -> BlogDocument structure detection. Rule-based, no AI.
//
// Pipeline:
//   items  -> per-page column detection (by x) -> lines (by y) ->
//   reading order (col1 top->bottom, then col2...) -> block classification
//   (headings / paragraphs / lists / callouts / quizzes / quotes) ->
//   title / subtitle / author inference.
//
// Signals used: font size, ALL-CAPS ratio, text length, vertical gaps,
// horizontal position/column, bullet/number/letter markers, drop caps.

import "server-only";
import type { BlogBlock, BlogDocument, PdfTextItem, QuizQuestion } from "@/types/blog";
import type { PdfExtract, PdfPage } from "./extract";

let _seq = 0;
const bid = () => `blk_${(_seq++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

interface Line {
  page: number;
  col: number;
  y: number;      // top-most baseline of the line
  bottom: number; // y + fontSize (approx line bottom)
  x: number;      // left edge
  text: string;
  fontSize: number;
  bold: boolean;
  caps: boolean;
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/ /g, " ").trim();

const round = (n: number, step = 0.5) => Math.round(n / step) * step;

const capsRatio = (s: string) => {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
};

// ---- 1. dominant body font size (char-weighted mode) ----------------------
function bodyFontSize(pages: PdfPage[]): number {
  const weight = new Map<number, number>();
  for (const pg of pages) {
    for (const it of pg.items) {
      const s = round(it.fontSize);
      weight.set(s, (weight.get(s) ?? 0) + it.text.length);
    }
  }
  let best = 10, bestW = 0;
  for (const [s, w] of weight) if (w > bestW) { bestW = w; best = s; }
  return best || 10;
}

// ---- 2. column detection (per page) --------------------------------------
function detectColumnStarts(pg: PdfPage, body: number): number[] {
  const cand = pg.items.filter(
    (i) => i.fontSize <= body * 1.35 && i.fontSize >= body * 0.7 && i.width < pg.width * 0.55
  );
  if (cand.length < 6) return [Math.min(...pg.items.map((i) => i.x), 0)];

  const lefts = cand.map((i) => i.x).sort((a, b) => a - b);
  const gap = pg.width * 0.045;
  const clusters: number[][] = [];
  let cur: number[] = [lefts[0]];
  for (let k = 1; k < lefts.length; k++) {
    if (lefts[k] - lefts[k - 1] > gap) { clusters.push(cur); cur = [lefts[k]]; }
    else cur.push(lefts[k]);
  }
  clusters.push(cur);

  const minSupport = Math.max(3, cand.length * 0.08);
  // use each cluster's LEFT edge (min) as the column start — using the mean
  // would push the boundary right of the column's own leftmost lines and
  // misassign them to the previous column (interleaving the text).
  let starts = clusters
    .filter((c) => c.length >= minSupport)
    .map((c) => Math.min(...c));
  if (starts.length === 0) starts = [Math.min(...lefts)];
  starts.sort((a, b) => a - b);
  return starts.slice(0, 3); // support up to 3 columns
}

const columnOf = (x: number, starts: number[]) => {
  let col = 0;
  for (let i = 0; i < starts.length; i++) if (x >= starts[i] - 4) col = i;
  return col;
};

// ---- 3. group a page's items into ordered lines ---------------------------
function pageLines(pg: PdfPage, body: number): Line[] {
  // drop obvious page furniture: tiny credits + lone page numbers at edges
  const items = pg.items.filter((it) => {
    if (it.fontSize < body * 0.55) return false;
    const edge = it.y < pg.height * 0.06 || it.y > pg.height * 0.95;
    if (edge && /^[0-9ivxlcIVXLC]{1,4}$/.test(it.text.trim())) return false;
    return true;
  });
  const starts = detectColumnStarts(pg, body);

  // bucket by column, then group into lines by baseline proximity
  const byCol = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    const c = it.width > pg.width * 0.55 ? 0 : columnOf(it.x + 1, starts);
    (byCol.get(c) ?? byCol.set(c, []).get(c)!).push(it);
  }

  const lines: Line[] = [];
  const cols = [...byCol.keys()].sort((a, b) => a - b);
  for (const col of cols) {
    const arr = byCol.get(col)!.sort((a, b) => a.y - b.y || a.x - b.x);
    let bucket: PdfTextItem[] = [];
    let lineY = -1e9;
    const flush = () => {
      if (!bucket.length) return;
      const sorted = bucket.slice().sort((a, b) => a.x - b.x);
      // drop near-duplicate copies (drop-shadow / outlined display type renders
      // the same glyphs twice at ~the same position → doubled text otherwise)
      const kept: PdfTextItem[] = [];
      for (const it of sorted) {
        if (kept.some((k) => k.text === it.text && Math.abs(k.x - it.x) < Math.max(2, it.fontSize * 0.25))) continue;
        kept.push(it);
      }
      let text = "";
      for (let i = 0; i < kept.length; i++) {
        const cur = kept[i];
        if (i > 0) {
          const prev = kept[i - 1];
          if (cur.x - (prev.x + prev.width) > cur.fontSize * 0.28) text += " ";
        }
        text += cur.text;
      }
      let t = clean(text);
      // final guard: a whole line rendered as exact halves ("ABAB" -> "AB")
      const half = t.length >> 1;
      if (t.length > 6 && t.length % 2 === 0 && t.slice(0, half) === t.slice(half)) t = t.slice(0, half).trim();
      // ignore giant single-glyph drop caps when measuring the line's size
      const sizers = kept.filter((b) => b.text.trim().length > 1 || b.fontSize <= body * 2);
      const fontSize = Math.max(...(sizers.length ? sizers : kept).map((b) => b.fontSize));
      const y = Math.min(...kept.map((b) => b.y));
      const x = Math.min(...kept.map((b) => b.x));
      if (t) lines.push({
        page: pg.page, col, y, bottom: y + fontSize, x, text: t, fontSize,
        bold: kept.some((b) => b.bold), caps: capsRatio(t) > 0.8,
      });
      bucket = [];
    };
    for (const it of arr) {
      const tol = Math.max(it.fontSize, lineY > -1e8 ? 0 : it.fontSize) * 0.5 || 3;
      if (bucket.length && Math.abs(it.y - lineY) > tol) flush();
      if (!bucket.length) lineY = it.y;
      bucket.push(it);
    }
    flush();
  }
  return lines;
}

// ---- 4. line role helpers -------------------------------------------------
const BULLET = /^\s*[•‣●◦⁃∙•▪◦‣·]\s+/;
const DASH_BULLET = /^\s*[-–—]\s+/;
const ORDERED = /^\s*\(?(\d{1,2})[.)]\s+/;
const OPTION = /^\s*([A-Da-d])[).]\s+(.+)/;

const stripMarker = (s: string) =>
  s.replace(BULLET, "").replace(DASH_BULLET, "").replace(ORDERED, "").trim();

function headingLevel(ratio: number): 1 | 2 | 3 | 0 {
  if (ratio >= 1.9) return 1;
  if (ratio >= 1.45) return 2;
  if (ratio >= 1.18) return 3;
  return 0;
}

// ---- 5. classify ordered lines into blocks --------------------------------
function classify(lines: Line[], body: number): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  let para: string[] = [];
  let prev: Line | null = null;
  let dropCap = "";

  const flushPara = () => {
    if (!para.length) return;
    let text = "";
    for (let i = 0; i < para.length; i++) {
      const seg = para[i];
      if (i === 0) { text = seg; continue; }
      if (/[-‐]$/.test(text) && /^[a-z]/.test(seg)) text = text.slice(0, -1) + seg; // de-hyphenate
      else text += " " + seg;
    }
    text = clean(dropCap + text);
    dropCap = "";
    if (text.length > 1) blocks.push({ id: bid(), type: "paragraph", text });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const ratio = ln.fontSize / body;
    const words = ln.text.split(/\s+/).length;
    const columnChange = prev && (prev.col !== ln.col || prev.page !== ln.page);
    const bigGap = prev && !columnChange && ln.y - prev.bottom > body * 1.15;

    // drop cap: a single huge glyph that belongs to the next paragraph
    if (ln.text.length <= 2 && ratio > 2.4) { flushPara(); dropCap = ln.text.trim(); prev = ln; continue; }

    // ordered list (also feeds quiz detection below)
    if (ORDERED.test(ln.text) || BULLET.test(ln.text) || (DASH_BULLET.test(ln.text) && ratio < 1.15)) {
      flushPara();
      const ordered = ORDERED.test(ln.text);
      const items: string[] = [];
      let j = i;
      while (j < lines.length) {
        const l = lines[j];
        const isBul = BULLET.test(l.text) || (DASH_BULLET.test(l.text) && l.fontSize / body < 1.15);
        const isOrd = ORDERED.test(l.text);
        if ((ordered && isOrd) || (!ordered && isBul)) { items.push(stripMarker(l.text)); j++; }
        else if (!ordered && !isOrd && !isBul && l.fontSize / body < 1.15 && items.length && l.y - lines[j - 1].bottom < body * 0.9) {
          items[items.length - 1] += " " + clean(l.text); j++; // wrapped list item
        } else break;
      }
      blocks.push({ id: bid(), type: ordered ? "ordered-list" : "bullet-list", items });
      prev = lines[j - 1]; i = j - 1; continue;
    }

    // quiz: a question line followed by >=2 lettered options
    if (ln.text.endsWith("?") && lines[i + 1] && OPTION.test(lines[i + 1].text)) {
      const questions: QuizQuestion[] = [];
      let j = i;
      while (j < lines.length && lines[j].text.endsWith("?") && lines[j + 1] && OPTION.test(lines[j + 1].text)) {
        const question = clean(lines[j].text);
        const options: QuizQuestion["options"] = [];
        let k = j + 1;
        while (k < lines.length) {
          const m = lines[k].text.match(OPTION);
          if (!m) break;
          options.push({ key: m[1].toUpperCase(), text: clean(m[2]) });
          k++;
        }
        questions.push({ question, options });
        j = k;
      }
      if (questions.length) {
        flushPara();
        blocks.push({ id: bid(), type: "quiz", questions });
        prev = lines[j - 1]; i = j - 1; continue;
      }
    }

    // heading (large text). Greedily merge same-size neighbours first so a
    // multi-line title / standfirst becomes ONE block instead of many.
    const level = headingLevel(ratio);
    if (level) {
      let text = ln.text;
      let last = ln;
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        const sameRun = l.page === last.page && l.col === last.col &&
          Math.abs(l.fontSize / body - ratio) < 0.12 && l.y - last.bottom < body * 1.0 &&
          !ORDERED.test(l.text) && !BULLET.test(l.text);
        if (!sameRun) break;
        text = /[-‐]$/.test(text) && /^[a-z]/.test(l.text) ? text.slice(0, -1) + l.text : text + " " + l.text;
        last = l; j++;
      }
      text = clean(text);
      const wc = text.split(/\s+/).length;
      flushPara();
      if (/^[“"'‘].+[”"'’]$/.test(text)) {
        blocks.push({ id: bid(), type: "quote", text: clean(text.replace(/^["“‘']|["”’']$/g, "")) });
      } else if (wc <= 16 && text.length <= 140) {
        blocks.push({ id: bid(), type: "heading", level, text });
      } else if (ratio >= 1.15 && ratio < 1.6) {
        // a large multi-line run of running text = pull-quote / standfirst
        blocks.push({ id: bid(), type: "quote", text });
      } else {
        blocks.push({ id: bid(), type: "paragraph", text });
      }
      prev = last; i = j - 1; continue;
    }

    // callout / sidebar: a short ALL-CAPS label at ~body size starts a boxed note
    if (ln.caps && ratio >= 0.9 && ratio < 1.45 && words <= 6 && ln.text.length <= 46) {
      const title = clean(ln.text);
      const content: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        const r = l.fontSize / body;
        if (headingLevel(r) || (l.caps && r >= 0.9 && l.text.split(/\s+/).length <= 6)) break;
        if (l.col !== ln.col && content.length) break;
        content.push(clean(l.text));
        j++;
        if (content.length >= 8) break;
      }
      if (content.length) {
        flushPara();
        blocks.push({ id: bid(), type: "callout", title, content: content.join(" ") });
        prev = lines[j - 1]; i = j - 1; continue;
      }
    }

    // pull-quote: slightly larger, quoted text
    if (ratio >= 1.1 && ratio < 1.45 && /^[“"'‘].+[”"'’]$/.test(ln.text.trim())) {
      flushPara();
      blocks.push({ id: bid(), type: "quote", text: clean(ln.text.replace(/^["“‘']|["”’']$/g, "")) });
      prev = ln; continue;
    }

    // paragraph body — merge, splitting on big gaps / column or page changes
    if (para.length && (bigGap || columnChange)) flushPara();
    para.push(clean(ln.text));
    prev = ln;
  }
  flushPara();
  return blocks;
}

// ---- 6. title / subtitle / author inference -------------------------------
const AUTHOR_RE = /^\s*(?:words|written by|by|text|author[s]?)\b[:\s]+(.+)/i;

function inferTitle(pages: PdfPage[], body: number): { title?: string } {
  const content = pages.filter((p) => p.items.length).slice(0, 2);
  if (!content.length) return {};
  const lines = content.flatMap((pg) =>
    pageLines(pg, body).filter((l) => l.text.length >= 3 && l.text.length <= 120 && l.y < pg.height * 0.7)
  );
  if (!lines.length) return {};
  // prefer the largest *multi-word* headline (a real title, not a one-word
  // kicker like "SPECIAL"); fall back to the largest line of any kind.
  const multiWord = lines.filter((l) => l.text.split(/\s+/).length >= 2 && l.text.length >= 8 && !l.caps);
  const capsMulti = lines.filter((l) => l.text.split(/\s+/).length >= 2 && l.text.length >= 8);
  const pool = multiWord.length ? multiWord : capsMulti.length ? capsMulti : lines;
  const best = pool.reduce((a, b) => (b.fontSize > a.fontSize ? b : a));
  if (best.fontSize < body * 1.3) return {};
  return { title: clean(best.text) };
}

export function buildBlogDocument(extract: PdfExtract, fileName: string): BlogDocument {
  _seq = 0;
  const body = bodyFontSize(extract.pages);

  // ordered lines across all pages, then classify
  const allLines: Line[] = [];
  for (const pg of extract.pages) allLines.push(...pageLines(pg, body));
  let blocks = classify(allLines, body);

  // --- title ---
  const inferred = inferTitle(extract.pages, body);
  let title = extract.meta.title?.trim() || inferred.title || fileName.replace(/\.pdf$/i, "");
  // if the inferred title matches an early heading block, promote & remove it
  const tIdx = blocks.findIndex(
    (b) => b.type === "heading" && clean(b.text).toLowerCase() === (inferred.title ?? "").toLowerCase()
  );
  if (tIdx !== -1) { title = clean((blocks[tIdx] as { text: string }).text); blocks.splice(tIdx, 1); }

  // --- author ("WORDS ...", "BY ...") ---
  let author = extract.meta.author?.trim() || undefined;
  for (let i = 0; i < Math.min(blocks.length, 12); i++) {
    const b = blocks[i];
    const text = b.type === "paragraph" ? b.text : b.type === "heading" ? b.text : "";
    const m = text.match(AUTHOR_RE);
    if (m && m[1].length <= 60) {
      author = clean(m[1]);
      if (b.type === "paragraph" || b.type === "heading") blocks.splice(i, 1);
      break;
    }
  }

  // --- subtitle: first sub-heading right after the title ---
  let subtitle: string | undefined = extract.meta.subject?.trim() || undefined;
  const subIdx = blocks.findIndex((b) => b.type === "heading");
  if (!subtitle && subIdx !== -1 && subIdx <= 1) {
    const h = blocks[subIdx] as { level: number; text: string };
    if (h.level >= 2 && h.text.length <= 120) { subtitle = clean(h.text); blocks.splice(subIdx, 1); }
  }

  // tidy: drop empties, collapse duplicate adjacent headings
  blocks = blocks.filter((b) => {
    if (b.type === "paragraph") return b.text.trim().length > 1;
    if (b.type === "heading" || b.type === "quote") return b.text.trim().length > 0;
    if (b.type === "bullet-list" || b.type === "ordered-list") return b.items.length > 0;
    return true;
  });

  const coverImage = blocks.find((b) => b.type === "image") as { url: string } | undefined;

  return {
    title: clean(title) || "Untitled",
    subtitle,
    author,
    coverImage: coverImage?.url,
    metadata: { sourceFileName: fileName, pageCount: extract.pageCount },
    blocks,
  };
}
