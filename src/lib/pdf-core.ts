// Environment-agnostic PDF text mapping shared by the server extractor and the
// in-browser parser. Pure (no node/browser APIs) so it bundles for both.

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

export const looksBold = (fontName: string, fam?: string) =>
  /bold|black|heavy|semibold|-b\b|,b\b/i.test(fontName) || /bold|black|heavy/i.test(fam ?? "");
export const looksItalic = (fontName: string, fam?: string) =>
  /italic|oblique|-i\b/i.test(fontName) || /italic|oblique/i.test(fam ?? "");

export interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

// Map one page's pdf.js text content into layout-aware items (top-down y).
export function mapTextItems(
  items: RawTextItem[],
  styles: Record<string, { fontFamily?: string }>,
  height: number,
  page: number
): PdfTextItem[] {
  const out: PdfTextItem[] = [];
  for (const raw of items) {
    const text = raw.str;
    if (!text || !text.trim()) continue;
    const t = raw.transform;
    // drop rotated runs (vertical photo credits etc.)
    if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) {
      if (Math.abs(t[1]) > 0.5 || Math.abs(t[2]) > 0.5) continue;
    }
    const fontSize = Math.hypot(t[2], t[3]) || raw.height || 0;
    const fam = styles?.[raw.fontName]?.fontFamily;
    out.push({
      page,
      text,
      x: t[4],
      y: height - t[5],
      width: raw.width,
      height: raw.height || fontSize,
      fontSize,
      fontName: raw.fontName,
      fontFamily: fam,
      bold: looksBold(raw.fontName, fam),
      italic: looksItalic(raw.fontName, fam),
    });
  }
  return out;
}
