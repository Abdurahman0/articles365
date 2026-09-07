// Filesystem-backed blog store (one JSON file per blog under .data/blogs).
// No database is configured in this project; this keeps the feature
// self-contained and swappable for a real DB later (same async interface).

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Blog, BlogDocument, BlogStatus, BlogSummary } from "@/types/blog";

const DATA_DIR = path.join(process.cwd(), ".data", "blogs");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function slugify(input: string): string {
  return (input || "untitled")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

async function readAll(): Promise<Blog[]> {
  await ensureDir();
  const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  const out: Blog[] = [];
  for (const f of files) {
    try { out.push(JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8"))); } catch { /* skip corrupt */ }
  }
  return out.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

async function write(blog: Blog) {
  await ensureDir();
  await fs.writeFile(path.join(DATA_DIR, `${blog.id}.json`), JSON.stringify(blog, null, 2), "utf8");
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const all = await readAll();
  const taken = new Set(all.filter((b) => b.id !== exceptId).map((b) => b.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const toSummary = (b: Blog): BlogSummary => ({
  id: b.id, slug: b.slug, title: b.title, subtitle: b.subtitle, author: b.author,
  coverImage: b.coverImage, status: b.status, createdAt: b.createdAt,
  updatedAt: b.updatedAt, publishedAt: b.publishedAt ?? null,
});

export const blogStore = {
  async list(opts?: { status?: BlogStatus }): Promise<BlogSummary[]> {
    const all = await readAll();
    return all.filter((b) => !opts?.status || b.status === opts.status).map(toSummary);
  },

  async get(idOrSlug: string): Promise<Blog | null> {
    await ensureDir();
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${idOrSlug}.json`), "utf8"));
    } catch { /* not an id — try slug */ }
    const all = await readAll();
    return all.find((b) => b.slug === idOrSlug) ?? null;
  },

  async create(input: {
    content: BlogDocument;
    status?: BlogStatus;
    sourcePdf?: string;
    slug?: string;
  }): Promise<Blog> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const doc = input.content;
    const slug = await uniqueSlug(slugify(input.slug || doc.title));
    const status: BlogStatus = input.status ?? "draft";
    const blog: Blog = {
      id, slug,
      title: doc.title,
      subtitle: doc.subtitle,
      author: doc.author,
      coverImage: doc.coverImage,
      content: doc,
      sourcePdf: input.sourcePdf,
      status,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === "published" ? now : null,
    };
    await write(blog);
    return blog;
  },

  async update(id: string, patch: {
    content?: BlogDocument;
    status?: BlogStatus;
    slug?: string;
  }): Promise<Blog | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const content = patch.content ?? existing.content;
    let slug = existing.slug;
    if (patch.slug && slugify(patch.slug) !== existing.slug) slug = await uniqueSlug(slugify(patch.slug), existing.id);
    const status = patch.status ?? existing.status;
    const updated: Blog = {
      ...existing,
      slug,
      title: content.title,
      subtitle: content.subtitle,
      author: content.author,
      coverImage: content.coverImage,
      content,
      status,
      updatedAt: now,
      publishedAt: status === "published" ? existing.publishedAt ?? now : existing.publishedAt ?? null,
    };
    await write(updated);
    return updated;
  },
};
