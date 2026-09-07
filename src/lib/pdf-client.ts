// In-browser PDF -> BlogDocument parser. Runs entirely on the client so large
// PDFs never hit the serverless request-body limit (Vercel caps it at ~4.5 MB).
// Same deterministic structure logic as the server; images are rasterised with
// <canvas> into downscaled JPEG data URIs (kept small so the saved JSON stays
// well under the API limit). No AI/LLM, no upload of the raw PDF.

import * as pdfjsLib from "pdfjs-dist";
import { mapTextItems, type PdfExtract, type PdfPage, type RawTextItem } from "@/lib/pdf-core";
import { buildBlogDocument } from "@/server/pdf/structure";
import type { BlogBlock, BlogDocument } from "@/types/blog";

let workerReady = false;
function ensureWorker() {
  if (!workerReady) { pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; workerReady = true; }
}

// ---- image extraction (client, via canvas) --------------------------------
const IMG_MAX_W = 800, IMG_MIN_DRAWN = 70, IMG_MIN_SRC = 90, IMG_MAX = 6;
const yield0 = () => new Promise((r) => setTimeout(r, 0));
type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const getObj = (objs: { get: (n: string, cb: (o: unknown) => void) => void }, name: string) =>
  new Promise<unknown>((res) => {
    let done = false;
    const to = setTimeout(() => { if (!done) { done = true; res(null); } }, 1500);
    try { objs.get(name, (o) => { if (!done) { done = true; clearTimeout(to); res(o); } }); }
    catch { clearTimeout(to); res(null); }
  });

type ImgObj = { width: number; height: number; kind: number; data: Uint8ClampedArray | Uint8Array };

// Downsample straight into a small target canvas — never allocate a full
// native-size canvas (a multi-megapixel photo would freeze/crash the tab).
function toDataUrl(obj: ImgObj): string | null {
  const { width, height, kind, data } = obj;
  const ch = kind === 3 ? 4 : kind === 2 ? 3 : 1;
  const scale = Math.min(1, IMG_MAX_W / width);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  const dst = document.createElement("canvas");
  dst.width = dw; dst.height = dh;
  const dctx = dst.getContext("2d");
  if (!dctx) return null;
  const img = dctx.createImageData(dw, dh);
  const out = img.data;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(height - 1, Math.floor(y / scale));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      const si = (sy * width + sx) * ch, di = (y * dw + x) * 4;
      if (ch === 1) { const g = data[si]; out[di] = g; out[di + 1] = g; out[di + 2] = g; out[di + 3] = 255; }
      else { out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = ch === 4 ? data[si + 3] : 255; }
    }
  }
  dctx.putImageData(img, 0, 0);
  return dst.toDataURL("image/jpeg", 0.72);
}

interface ClientImage { page: number; y: number; drawnW: number; drawnH: number; url: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractImages(doc: any): Promise<ClientImage[]> {
  const OPS = pdfjsLib.OPS;
  const results: ClientImage[] = [];
  const deadline = performance.now() + 14000; // hard budget so parsing never hangs
  for (let p = 1; p <= doc.numPages && results.length < IMG_MAX; p++) {
    if (performance.now() > deadline) break;
    try {
      const page = await doc.getPage(p);
      const vpH = page.getViewport({ scale: 1 }).height;
      // In worker mode pdf.js only resolves image XObjects during rendering, so
      // render the page at a low scale first — otherwise page.objs.get never
      // returns and every image is silently dropped.
      try {
        const vp = page.getViewport({ scale: 0.35 });
        const rc = document.createElement("canvas");
        rc.width = Math.max(1, Math.floor(vp.width));
        rc.height = Math.max(1, Math.floor(vp.height));
        const rctx = rc.getContext("2d");
        if (rctx) await page.render({ canvas: rc, canvasContext: rctx, viewport: vp }).promise;
      } catch { /* rendering is only to populate objs */ }
      const ol = await page.getOperatorList();
      let ctm: M = [1, 0, 0, 1, 0, 0];
      const stack: M[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < ol.fnArray.length && results.length < IMG_MAX; i++) {
        if (performance.now() > deadline) break;
        const fn = ol.fnArray[i];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (fn === OPS.transform) ctm = mul(ctm, ol.argsArray[i] as M);
        else if (fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat) {
          const name = ol.argsArray[i][0] as string;
          if (typeof name !== "string" || seen.has(name)) continue;
          seen.add(name);
          const c0 = apply(ctm, 0, 0), c1 = apply(ctm, 1, 0), c2 = apply(ctm, 0, 1), c3 = apply(ctm, 1, 1);
          const drawnW = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]);
          const drawnH = Math.hypot(c2[0] - c0[0], c2[1] - c0[1]);
          if (drawnW < IMG_MIN_DRAWN || drawnH < IMG_MIN_DRAWN) continue;
          const yTop = vpH - Math.max(c0[1], c1[1], c2[1], c3[1]);
          const obj = (await getObj(page.objs, name)) as ImgObj | null;
          if (!obj?.data || !obj.width || !obj.height) continue;
          if (obj.width < IMG_MIN_SRC || obj.height < IMG_MIN_SRC || ![1, 2, 3].includes(obj.kind)) continue;
          const url = toDataUrl(obj);
          if (url) results.push({ page: p, y: yTop, drawnW, drawnH, url });
          await yield0(); // keep the UI responsive between heavy images
        }
      }
      page.cleanup();
    } catch { /* skip page */ }
  }
  return results;
}

function placeImages(doc: BlogDocument, images: ClientImage[]) {
  if (!images.length) return;
  const sorted = [...images].sort((a, b) => b.drawnW * b.drawnH - a.drawnW * a.drawnH);
  doc.coverImage = sorted[0].url;
  const rest = sorted.slice(1).sort((a, b) => a.page - b.page || a.y - b.y);
  if (!rest.length) return;
  const mk = (url: string): BlogBlock => ({ id: `img_${Math.random().toString(36).slice(2, 9)}`, type: "image", url });
  const paraIdx = doc.blocks.map((b, i) => (b.type === "paragraph" ? i : -1)).filter((i) => i >= 0);
  if (!paraIdx.length) { rest.forEach((img) => doc.blocks.push(mk(img.url))); return; }
  const step = Math.max(1, Math.floor(paraIdx.length / (rest.length + 1)));
  rest
    .map((img, n) => ({ at: paraIdx[Math.min(paraIdx.length - 1, step * (n + 1))], block: mk(img.url) }))
    .sort((a, b) => b.at - a.at)
    .forEach(({ at, block }) => doc.blocks.splice(at + 1, 0, block));
}

// ---- public entry ---------------------------------------------------------
export async function parsePdfInBrowser(file: File, onStage?: (s: string) => void): Promise<BlogDocument> {
  ensureWorker();
  onStage?.("Reading file…");
  const buf = new Uint8Array(await file.arrayBuffer());
  if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46))
    throw new Error("This file is not a valid PDF.");

  onStage?.("Extracting text…");
  const params = { data: buf, isEvalSupported: false };
  const doc = await pdfjsLib.getDocument(params).promise;
  try {
    let meta: PdfExtract["meta"] = {};
    try {
      const m = await doc.getMetadata();
      const info = (m?.info ?? {}) as Record<string, unknown>;
      meta = {
        title: typeof info.Title === "string" ? info.Title : undefined,
        author: typeof info.Author === "string" ? info.Author : undefined,
        subject: typeof info.Subject === "string" ? info.Subject : undefined,
      };
    } catch { /* optional */ }

    const pages: PdfPage[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      pages.push({
        page: p, width: vp.width, height: vp.height,
        items: mapTextItems(content.items as RawTextItem[], content.styles as Record<string, { fontFamily?: string }>, vp.height, p),
      });
      page.cleanup();
    }
    if (!pages.some((pg) => pg.items.length))
      throw new Error("No selectable text found in this PDF (it may be a scan or image-only).");

    onStage?.("Analyzing layout & building article…");
    const document = buildBlogDocument({ pageCount: doc.numPages, meta, pages }, file.name);

    onStage?.("Extracting images…");
    try {
      // hard cap the whole image pass — a slow render() await can't be
      // interrupted internally, so race it so parsing always finishes
      const imgs = await Promise.race<ClientImage[]>([
        extractImages(doc),
        new Promise<ClientImage[]>((r) => setTimeout(() => r([]), 16000)),
      ]);
      placeImages(document, imgs);
    } catch { /* images best-effort */ }

    if (!document.blocks.length) throw new Error("No readable content could be extracted from this PDF.");
    return document;
  } finally {
    try { await (doc as unknown as { destroy(): Promise<void> }).destroy(); } catch { /* ignore */ }
  }
}
