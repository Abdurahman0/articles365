// Low-level PDF extraction using pdfjs-dist in Node (no worker, no canvas).
// Produces an intermediate, layout-aware representation — text with
// coordinates, size and font — that the deterministic structure parser
// consumes. No AI/LLM, no network.

import "server-only";
import type { PdfTextItem } from "@/types/blog";

export interface PdfPage {
  page: number;
  width: number;
  height: number;
  items: PdfTextItem[];
}

export interface PdfExtract {
  pageCount: number;
  meta: { title?: string; author?: string; subject?: string };
  pages: PdfPage[];
}

// pdfjs is ESM-only and heavy; load it lazily so it never runs at build time.
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
};

const looksBold = (fontName: string, fam?: string) =>
  /bold|black|heavy|semibold|-b\b|,b\b/i.test(fontName) || /bold|black|heavy/i.test(fam ?? "");
const looksItalic = (fontName: string, fam?: string) =>
  /italic|oblique|-i\b/i.test(fontName) || /italic|oblique/i.test(fam ?? "");

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
    const H = viewport.height;
    const content = await page.getTextContent();
    const styles = content.styles as Record<string, { fontFamily?: string }>;
    const items: PdfTextItem[] = [];
    for (const raw of content.items as TextItem[]) {
      const text = raw.str;
      if (!text || !text.trim()) continue;
      const t = raw.transform;
      // skip rotated text (page furniture like vertical photo credits)
      if (Math.abs(t[1]) > 0.5 || Math.abs(t[2]) > 0.5) {
        // t[1]/t[2] are the skew/rotation terms; a pure horizontal run has them ~0
        const rotated = Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01;
        const fontSizeRot = Math.hypot(t[0], t[1]) || Math.hypot(t[2], t[3]);
        if (rotated && fontSizeRot > 0) continue;
      }
      const fontSize = Math.hypot(t[2], t[3]) || raw.height || 0;
      const fam = styles?.[raw.fontName]?.fontFamily;
      items.push({
        page: p,
        text,
        x: t[4],
        y: H - t[5], // baseline in top-down coordinates
        width: raw.width,
        height: raw.height || fontSize,
        fontSize,
        fontName: raw.fontName,
        fontFamily: fam,
        bold: looksBold(raw.fontName, fam),
        italic: looksItalic(raw.fontName, fam),
      });
    }
    pages.push({ page: p, width: viewport.width, height: H, items });
    page.cleanup();
  }
  return { pageCount: doc.numPages, meta, pages };
}
