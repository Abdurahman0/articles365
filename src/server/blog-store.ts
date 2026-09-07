// Blog store with two interchangeable backends behind one async interface:
//   - Vercel Blob  (when BLOB_READ_WRITE_TOKEN is set — e.g. on Vercel, whose
//                   runtime filesystem is read-only)
//   - Filesystem   (.data/blogs/*.json — local dev / self-hosted)
// Image bytes are inlined as data URIs in the document, so no separate blob
// upload is needed for media.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put as blobPut, list as blobList } from "@vercel/blob";
import type { Blog, BlogDocument, BlogStatus, BlogSummary } from "@/types/blog";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = path.join(process.cwd(), ".data", "blogs");
const BLOB_PREFIX = "blogs/";

// exposed so API error responses can say which backend was in use (diagnostics)
export const STORE_BACKEND = USE_BLOB ? "blob" : "fs";

export function slugify(input: string): string {
  return (input || "untitled")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

const byUpdated = (a: Blog, b: Blog) => +new Date(b.updatedAt) - +new Date(a.updatedAt);

// ---- backend: read all ----------------------------------------------------
async function readAll(): Promise<Blog[]> {
  if (USE_BLOB) {
    const { blobs } = await blobList({ prefix: BLOB_PREFIX });
    const out: Blog[] = [];
    for (const b of blobs) {
      try { const r = await fetch(b.url, { cache: "no-store" }); if (r.ok) out.push(await r.json()); } catch { /* skip */ }
    }
    return out.sort(byUpdated);
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  const out: Blog[] = [];
  for (const f of files) {
    try { out.push(JSON.parse(await fs.readFile(path.join(DATA_DIR, f), "utf8"))); } catch { /* skip */ }
  }
  return out.sort(byUpdated);
}

// ---- backend: write one ---------------------------------------------------
async function writeBlog(blog: Blog): Promise<void> {
  if (USE_BLOB) {
    await blobPut(`${BLOB_PREFIX}${blog.id}.json`, JSON.stringify(blog), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${blog.id}.json`), JSON.stringify(blog, null, 2), "utf8");
}

// ---- backend: get by id or slug -------------------------------------------
async function getOne(idOrSlug: string): Promise<Blog | null> {
  if (USE_BLOB) {
    try {
      const { blobs } = await blobList({ prefix: `${BLOB_PREFIX}${idOrSlug}.json` });
      const exact = blobs.find((b) => b.pathname === `${BLOB_PREFIX}${idOrSlug}.json`);
      if (exact) { const r = await fetch(exact.url, { cache: "no-store" }); if (r.ok) return r.json(); }
    } catch { /* fall through to slug scan */ }
    return (await readAll()).find((b) => b.slug === idOrSlug) ?? null;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${idOrSlug}.json`), "utf8")); } catch { /* try slug */ }
  return (await readAll()).find((b) => b.slug === idOrSlug) ?? null;
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const taken = new Set((await readAll()).filter((b) => b.id !== exceptId).map((b) => b.slug));
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

  get(idOrSlug: string): Promise<Blog | null> {
    return getOne(idOrSlug);
  },

  async create(input: { content: BlogDocument; status?: BlogStatus; sourcePdf?: string; slug?: string }): Promise<Blog> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const doc = input.content;
    const slug = await uniqueSlug(slugify(input.slug || doc.title));
    const status: BlogStatus = input.status ?? "draft";
    const blog: Blog = {
      id, slug,
      title: doc.title, subtitle: doc.subtitle, author: doc.author, coverImage: doc.coverImage,
      content: doc, sourcePdf: input.sourcePdf, status,
      createdAt: now, updatedAt: now,
      publishedAt: status === "published" ? now : null,
    };
    await writeBlog(blog);
    return blog;
  },

  async update(id: string, patch: { content?: BlogDocument; status?: BlogStatus; slug?: string }): Promise<Blog | null> {
    const existing = await getOne(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const content = patch.content ?? existing.content;
    let slug = existing.slug;
    if (patch.slug && slugify(patch.slug) !== existing.slug) slug = await uniqueSlug(slugify(patch.slug), existing.id);
    const status = patch.status ?? existing.status;
    const updated: Blog = {
      ...existing, slug,
      title: content.title, subtitle: content.subtitle, author: content.author, coverImage: content.coverImage,
      content, status, updatedAt: now,
      publishedAt: status === "published" ? existing.publishedAt ?? now : existing.publishedAt ?? null,
    };
    await writeBlog(updated);
    return updated;
  },
};
