import type { BookPage, TocItem } from "@/types";
import { getBookById } from "./catalog";

// Deterministic PRNG so generated content is stable across renders (SSR-safe).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

const CHAPTER_TITLES = [
  "Introduction",
  "First Principles",
  "The Core Idea",
  "Systems & Structure",
  "The Hard Parts",
  "In Practice",
  "Common Failures",
  "A Better Model",
  "Edge Cases",
  "Putting It Together",
  "The Long Game",
  "Conclusion",
];

const SECTIONS = [
  "Framing the problem",
  "What the evidence shows",
  "A working definition",
  "The counter-argument",
  "Where it breaks down",
];

const SENTENCES = [
  "The most durable ideas rarely announce themselves; they arrive quietly and only later reveal their weight.",
  "Progress here is less about a single breakthrough than about the patient removal of everything that does not work.",
  "It is tempting to mistake activity for advancement, yet the two are often inversely related.",
  "A good model is not one that explains everything, but one that fails in instructive ways.",
  "When incentives and intentions diverge, structure quietly wins every time.",
  "The practitioner learns to distrust the elegance of a plan that has never met reality.",
  "What looks like intuition is usually compressed experience, replayed faster than we can narrate it.",
  "Constraints are not the enemy of creativity; they are the grammar that makes it legible.",
  "Every system optimises for something, and the interesting question is always what it quietly ignores.",
  "The margin that separates competent work from exceptional work is almost entirely invisible from the outside.",
  "We overestimate what changes in a year and badly underestimate what compounds across a decade.",
  "Clarity is expensive: it requires discarding the comfortable ambiguity that lets everyone feel right.",
  "The discipline is not in having the idea, but in refusing to abandon it when the returns go flat.",
  "Trust, once encoded into a protocol, scales in ways that goodwill never could.",
  "Attention is the one resource you cannot borrow, and the only one everyone is trying to spend for you.",
  "The best decisions look obvious in hindsight and reckless in the moment they are made.",
  "Craft is what remains after the deadline has stripped away everything that was merely decorative.",
  "A number without a denominator is a story wearing the costume of a fact.",
  "The map you were handed was drawn by someone solving a different problem than the one in front of you.",
  "Resilience is not the absence of failure but the speed and grace of the recovery.",
];

function paragraph(rnd: () => number): string {
  const n = 3 + Math.floor(rnd() * 3);
  const out: string[] = [];
  for (let i = 0; i < n; i++)
    out.push(SENTENCES[Math.floor(rnd() * SENTENCES.length)]);
  return out.join(" ");
}

export interface BookContent {
  pageCount: number;
  toc: TocItem[];
  pages: BookPage[];
}

const cache = new Map<string, BookContent>();

export function getBookContent(bookId: string): BookContent {
  const cached = cache.get(bookId);
  if (cached) return cached;

  const book = getBookById(bookId);
  const rnd = mulberry32(seedFrom(bookId));
  const chapterCount = 6 + Math.floor(rnd() * 4); // 6..9
  const pages: BookPage[] = [];
  const toc: TocItem[] = [];
  let page = 1;

  for (let c = 0; c < chapterCount; c++) {
    const title =
      c === 0
        ? CHAPTER_TITLES[0]
        : c === chapterCount - 1
          ? "Conclusion"
          : CHAPTER_TITLES[1 + ((c - 1) % (CHAPTER_TITLES.length - 2))];
    const chapterId = `ch-${c + 1}`;
    const chapterStart = page;
    const pagesInChapter = 3 + Math.floor(rnd() * 4); // 3..6
    const children: TocItem[] = [];

    for (let p = 0; p < pagesInChapter; p++) {
      const paras: string[] = [];
      const paraCount = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < paraCount; k++) paras.push(paragraph(rnd));
      pages.push({
        page,
        chapterId,
        heading: p === 0 ? `${String(c + 1).padStart(2, "0")}  ${title}` : undefined,
        paragraphs: paras,
      });
      // occasionally add a TOC sub-section
      if (p > 0 && p < pagesInChapter - 1 && rnd() > 0.55) {
        children.push({
          id: `${chapterId}-s${p}`,
          title: SECTIONS[Math.floor(rnd() * SECTIONS.length)],
          page,
        });
      }
      page++;
    }

    toc.push({
      id: chapterId,
      title: `${String(c + 1).padStart(2, "0")}  ${title}`,
      page: chapterStart,
      children: children.length ? children : undefined,
    });
  }

  const content: BookContent = { pageCount: pages.length, toc, pages };
  cache.set(bookId, content);
  // keep book label handy for callers
  void book;
  return content;
}

/** Simple client-side full-text search over generated content. */
export function searchInBook(bookId: string, query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const { pages } = getBookContent(bookId);
  const hits: { page: number; snippet: string; occurrences: number }[] = [];
  for (const pg of pages) {
    const text = pg.paragraphs.join(" ");
    const idx = text.toLowerCase().indexOf(q);
    if (idx >= 0) {
      const occ = text.toLowerCase().split(q).length - 1;
      const start = Math.max(0, idx - 34);
      hits.push({
        page: pg.page,
        snippet:
          (start > 0 ? "…" : "") +
          text.slice(start, idx + q.length + 44) +
          "…",
        occurrences: occ,
      });
    }
  }
  return hits;
}
