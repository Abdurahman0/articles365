"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BOOKMARKS, HIGHLIGHTS, NOTES } from "@/data/annotations";
import type { Bookmark, Highlight, HighlightColor, Note } from "@/types";

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${counter++}`;

interface AnnotationsState {
  highlights: Highlight[];
  bookmarks: Bookmark[];
  notes: Note[];

  addHighlight: (h: Omit<Highlight, "id" | "createdAt">) => Highlight;
  setHighlightColor: (id: string, color: HighlightColor) => void;
  removeHighlight: (id: string) => void;

  toggleBookmark: (bookId: string, bookTitle: string, page: number, label?: string) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (bookId: string, page: number) => boolean;

  addNote: (n: Omit<Note, "id" | "createdAt" | "updatedAt">) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "content">>) => void;
  removeNote: (id: string) => void;
}

export const useAnnotations = create<AnnotationsState>()(
  persist(
    (set, get) => ({
      highlights: HIGHLIGHTS,
      bookmarks: BOOKMARKS,
      notes: NOTES,

      addHighlight: (h) => {
        const item: Highlight = {
          ...h,
          id: uid("h"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ highlights: [item, ...s.highlights] }));
        return item;
      },
      setHighlightColor: (id, color) =>
        set((s) => ({
          highlights: s.highlights.map((h) =>
            h.id === id ? { ...h, color } : h
          ),
        })),
      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

      toggleBookmark: (bookId, bookTitle, page, label) => {
        const existing = get().bookmarks.find(
          (b) => b.bookId === bookId && b.page === page
        );
        if (existing) {
          set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== existing.id) }));
        } else {
          const item: Bookmark = {
            id: uid("b"),
            bookId,
            bookTitle,
            page,
            label,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({ bookmarks: [item, ...s.bookmarks] }));
        }
      },
      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
      isBookmarked: (bookId, page) =>
        get().bookmarks.some((b) => b.bookId === bookId && b.page === page),

      addNote: (n) => {
        const now = new Date().toISOString();
        const item: Note = { ...n, id: uid("n"), createdAt: now, updatedAt: now };
        set((s) => ({ notes: [item, ...s.notes] }));
        return item;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, ...patch, updatedAt: new Date().toISOString() }
              : n
          ),
        })),
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    {
      name: "a365.annotations",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
