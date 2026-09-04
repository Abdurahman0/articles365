import { LIBRARY, getOwnedBook } from "@/data/library";
import { delay } from "@/lib/utils";
import type { OwnedBook } from "@/types";

export const libraryApi = {
  async list(): Promise<OwnedBook[]> {
    await delay(300);
    return LIBRARY;
  },
  async get(id: string): Promise<OwnedBook | undefined> {
    await delay(200);
    return getOwnedBook(id);
  },
  async continueReading(): Promise<OwnedBook[]> {
    await delay(200);
    return LIBRARY.filter((b) => b.readingStatus === "reading").sort(
      (a, b) => +new Date(b.lastReadAt ?? 0) - +new Date(a.lastReadAt ?? 0)
    );
  },
};
