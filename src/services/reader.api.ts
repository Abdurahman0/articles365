import { getBookContent, searchInBook, type BookContent } from "@/data/content";
import { getOwnedBook } from "@/data/library";
import { delay } from "@/lib/utils";
import type { OwnedBook } from "@/types";

export interface ReaderManifest {
  book: OwnedBook;
  content: BookContent;
  /** dynamic watermark payload from the (mock) authenticated session */
  watermark: { line1: string; line2: string };
}

export const readerApi = {
  async manifest(bookId: string): Promise<ReaderManifest | null> {
    await delay(350);
    const book = getOwnedBook(bookId);
    if (!book) return null;
    const content = getBookContent(bookId);
    return {
      book,
      content,
      watermark: { line1: "A365 • USER 2842", line2: "+998 ** *** 45 12" },
    };
  },
  async search(bookId: string, q: string) {
    await delay(150);
    return searchInBook(bookId, q);
  },
};
