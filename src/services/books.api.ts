import { BOOKS, CATEGORIES, getBookBySlug, getCategoryBySlug } from "@/data/catalog";
import { delay } from "@/lib/utils";
import type { Book, Category } from "@/types";

export const booksApi = {
  async list(): Promise<Book[]> {
    await delay(250);
    return BOOKS;
  },
  async featured(): Promise<Book[]> {
    await delay(200);
    return BOOKS.filter((b) => b.featured);
  },
  async recent(limit = 8): Promise<Book[]> {
    await delay(200);
    return [...BOOKS]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  },
  async bySlug(slug: string): Promise<Book | undefined> {
    await delay(200);
    return getBookBySlug(slug);
  },
  async categories(): Promise<Category[]> {
    await delay(150);
    return CATEGORIES;
  },
  async category(slug: string): Promise<Category | undefined> {
    await delay(150);
    return getCategoryBySlug(slug);
  },
  async byCategory(slug: string): Promise<Book[]> {
    await delay(200);
    return BOOKS.filter((b) => b.category.slug === slug);
  },
};
