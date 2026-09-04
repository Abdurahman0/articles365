import type { OwnedBook, ReadingStatus } from "@/types";
import { BOOKS } from "./catalog";

interface Prog {
  slug: string;
  status: ReadingStatus;
  progress: number;
  lastPage: number;
  lastReadAt?: string;
  bookmarksCount: number;
  notesCount: number;
  highlightsCount: number;
}

// The current user owns these (access granted by admin).
const OWNED: Prog[] = [
  { slug: "the-art-of-exploitation", status: "reading", progress: 34, lastPage: 12, lastReadAt: "2026-09-03T18:20:00.000Z", bookmarksCount: 3, notesCount: 2, highlightsCount: 5 },
  { slug: "the-founders-map", status: "reading", progress: 62, lastPage: 19, lastReadAt: "2026-09-04T08:05:00.000Z", bookmarksCount: 2, notesCount: 4, highlightsCount: 7 },
  { slug: "the-quiet-compounding", status: "completed", progress: 100, lastPage: 28, lastReadAt: "2026-08-28T21:40:00.000Z", bookmarksCount: 1, notesCount: 1, highlightsCount: 3 },
  { slug: "type-and-tension", status: "new", progress: 0, lastPage: 1, bookmarksCount: 0, notesCount: 0, highlightsCount: 0 },
  { slug: "deep-work-systems", status: "reading", progress: 18, lastPage: 6, lastReadAt: "2026-09-01T12:10:00.000Z", bookmarksCount: 1, notesCount: 0, highlightsCount: 2 },
  { slug: "protocols-of-trust", status: "new", progress: 0, lastPage: 1, bookmarksCount: 0, notesCount: 0, highlightsCount: 0 },
];

export const LIBRARY: OwnedBook[] = OWNED.map((p) => {
  const book = BOOKS.find((b) => b.slug === p.slug)!;
  return {
    ...book,
    readingStatus: p.status,
    progress: p.progress,
    lastPage: p.lastPage,
    lastReadAt: p.lastReadAt,
    bookmarksCount: p.bookmarksCount,
    notesCount: p.notesCount,
    highlightsCount: p.highlightsCount,
  };
});

export const getOwnedBook = (id: string) =>
  LIBRARY.find((b) => b.id === id);
export const getOwnedBookBySlug = (slug: string) =>
  LIBRARY.find((b) => b.slug === slug);
