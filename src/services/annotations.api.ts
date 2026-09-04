import { BOOKMARKS, HIGHLIGHTS, NOTES } from "@/data/annotations";
import { delay } from "@/lib/utils";
import type { Bookmark, Highlight, Note } from "@/types";

// Read-only mock feeds; live mutations are handled in the Zustand reader store
// so interactions feel instant. These power the global list pages + previews.
export const annotationsApi = {
  async highlights(): Promise<Highlight[]> {
    await delay(250);
    return HIGHLIGHTS;
  },
  async bookmarks(): Promise<Bookmark[]> {
    await delay(250);
    return BOOKMARKS;
  },
  async notes(): Promise<Note[]> {
    await delay(250);
    return NOTES;
  },
  async byBook(bookId: string) {
    await delay(150);
    return {
      highlights: HIGHLIGHTS.filter((h) => h.bookId === bookId),
      bookmarks: BOOKMARKS.filter((b) => b.bookId === bookId),
      notes: NOTES.filter((n) => n.bookId === bookId),
    };
  },
};
