// Low-level PDF extraction using pdfjs-dist in Node (no worker, no canvas).
// Produces an intermediate, layout-aware representation — text with
// coordinates, size and font — that the deterministic structure parser
// consumes. No AI/LLM, no network. Mapping logic is shared with the browser
// parser via @/lib/pdf-core.

import "server-only";
import { mapTextItems, type PdfExtract, type PdfPage, type RawTextItem } from "@/lib/pdf-core";

export type { PdfExtract, PdfPage } from "@/lib/pdf-core";

// pdfjs is ESM-only and heavy; load it lazily so it never runs at build time.
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

// Open the document once; the caller shares it between text + image passes
// and is responsible for calling doc.destroy() when done.
export async function openPdf(data: Uint8Array) {
  const pdfjs = await loadPdfjs();
  // stored in a variable so extra hardening options (isEvalSupported) don't
  // trip the excess-property check against pdfjs's DocumentInitParameters type
  const params = {
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    disableAutoFetch: true,
    disableStream: true,
  };
  const doc = await pdfjs.getDocument(params).promise;
  return { pdfjs, doc };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readExtract(doc: any): Promise<PdfExtract> {
  let meta: PdfExtract["meta"] = {};
  try {
    const m = await doc.getMetadata();
    const info = (m?.info ?? {}) as Record<string, unknown>;
    meta = {
      title: typeof info.Title === "string" ? info.Title : undefined,
      author: typeof info.Author === "string" ? info.Author : undefined,
      subject: typeof info.Subject === "string" ? info.Subject : undefined,
    };
  } catch { /* metadata is optional */ }

  const pages: PdfPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const styles = content.styles as Record<string, { fontFamily?: string }>;
    pages.push({
      page: p,
      width: viewport.width,
      height: viewport.height,
      items: mapTextItems(content.items as RawTextItem[], styles, viewport.height, p),
    });
    page.cleanup();
  }
  return { pageCount: doc.numPages, meta, pages };
}
