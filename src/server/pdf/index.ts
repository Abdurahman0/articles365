// Orchestrates PDF -> BlogDocument: text extraction, deterministic structure
// detection, and best-effort image extraction. No AI/LLM, no network.

import "server-only";
import type { BlogBlock, BlogDocument } from "@/types/blog";
import { openPdf, readExtract } from "./extract";
import { buildBlogDocument } from "./structure";
import { extractImages, type ExtractedImage } from "./images";

export interface ConvertOptions {
  fileName: string;
  /** absolute path to public/blog-media/import */
  imageOutDir: string;
  /** public URL base, e.g. /blog-media/import */
  imageUrlBase: string;
  withImages?: boolean;
}

// place the cover + distribute remaining images across the text blocks so the
// article reads like a magazine rather than a wall of text.
function placeImages(doc: BlogDocument, images: ExtractedImage[]) {
  if (!images.length) return;
  const sorted = [...images].sort((a, b) => b.drawnW * b.drawnH - a.drawnW * a.drawnH);
  const cover = sorted[0];
  doc.coverImage = cover.url;

  const rest = sorted.slice(1).sort((a, b) => a.page - b.page || a.y - b.y);
  if (!rest.length) return;

  const paraIdx = doc.blocks.map((b, i) => (b.type === "paragraph" ? i : -1)).filter((i) => i >= 0);
  if (!paraIdx.length) {
    for (const img of rest) doc.blocks.push({ id: `img_${img.url}`, type: "image", url: img.url });
    return;
  }
  const step = Math.max(1, Math.floor(paraIdx.length / (rest.length + 1)));
  const inserts: { at: number; block: BlogBlock }[] = [];
  rest.forEach((img, n) => {
    const anchor = paraIdx[Math.min(paraIdx.length - 1, step * (n + 1))];
    inserts.push({ at: anchor, block: { id: `img_${img.url}`, type: "image", url: img.url } });
  });
  // insert from the end so indices stay valid
  inserts.sort((a, b) => b.at - a.at).forEach(({ at, block }) => doc.blocks.splice(at + 1, 0, block));
}

export async function pdfToBlogDocument(data: Uint8Array, opts: ConvertOptions): Promise<BlogDocument> {
  const { pdfjs, doc } = await openPdf(data);
  try {
    const extract = await readExtract(doc);
    if (!extract.pages.some((p) => p.items.length)) {
      throw new Error("No selectable text found in this PDF (it may be a scan or image-only).");
    }
    const document = buildBlogDocument(extract, opts.fileName);

    if (opts.withImages !== false) {
      try {
        const images = await extractImages(pdfjs, doc, opts.imageOutDir, opts.imageUrlBase);
        placeImages(document, images);
      } catch { /* images are best-effort; text stands on its own */ }
    }
    return document;
  } finally {
    try { await (doc as unknown as { destroy(): Promise<void> }).destroy(); } catch { /* ignore */ }
  }
}
