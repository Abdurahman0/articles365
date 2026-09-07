// Best-effort PDF image extraction (no canvas, no external deps).
// Resolves image XObjects via the operator list, tracks the CTM to know each
// image's on-page position/size, downscales, and PNG-encodes with node:zlib.
// Every step is guarded — if an image fails, it is skipped, never fatal.

import "server-only";
import zlib from "node:zlib";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface ExtractedImage {
  page: number;
  y: number;      // top-down position on the page (for ordering)
  drawnW: number;
  drawnH: number;
  url: string;    // public URL under /blog-media/import
  width: number;  // encoded pixel size
  height: number;
}

const MAX_W = 1100;        // downscale target
const MIN_DRAWN = 70;      // ignore tiny placed images (icons/rules)
const MIN_SRC = 90;        // ignore tiny sources
const MAX_IMAGES = 10;     // safety cap per document

// ---- tiny 2x3 matrix helpers (pdfjs Util.transform convention) ------------
type M = [number, number, number, number, number, number];
const IDENT: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m: M, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

// ---- PNG encoder (RGBA, filter 0) -----------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- source (any kind) -> downscaled RGBA ---------------------------------
function toRgbaScaled(src: Uint8ClampedArray | Uint8Array, sw: number, sh: number, kind: number) {
  const scale = Math.min(1, MAX_W / sw);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const out = Buffer.alloc(dw * dh * 4);
  // channels per source pixel
  const ch = kind === 3 ? 4 : kind === 2 ? 3 : 1; // 3=RGBA,2=RGB,1=gray
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y / scale));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x / scale));
      const si = (sy * sw + sx) * ch;
      const di = (y * dw + x) * 4;
      if (ch === 1) { const g = src[si]; out[di] = g; out[di + 1] = g; out[di + 2] = g; out[di + 3] = 255; }
      else { out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = ch === 4 ? src[si + 3] : 255; }
    }
  }
  return { data: out, width: dw, height: dh };
}

const getObj = (objs: { get: (n: string, cb: (o: unknown) => void) => void }, name: string) =>
  new Promise<unknown>((res) => {
    let done = false;
    const to = setTimeout(() => { if (!done) { done = true; res(null); } }, 2500);
    try { objs.get(name, (o) => { if (!done) { done = true; clearTimeout(to); res(o); } }); }
    catch { clearTimeout(to); res(null); }
  });

type ImgObj = { width: number; height: number; kind: number; data: Uint8ClampedArray | Uint8Array };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractImages(pdfjs: any, doc: any, outDir: string, urlBase: string): Promise<ExtractedImage[]> {
  const OPS = pdfjs.OPS;
  const results: ExtractedImage[] = [];
  await fs.mkdir(outDir, { recursive: true });

  for (let p = 1; p <= doc.numPages && results.length < MAX_IMAGES; p++) {
    let page: unknown;
    try {
      page = await doc.getPage(p);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pg = page as any;
      const vpH = pg.getViewport({ scale: 1 }).height;
      const ol = await pg.getOperatorList();
      let ctm: M = IDENT;
      const stack: M[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < ol.fnArray.length; i++) {
        const fn = ol.fnArray[i];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() ?? IDENT;
        else if (fn === OPS.transform) ctm = mul(ctm, ol.argsArray[i] as M);
        else if (fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat) {
          const name = ol.argsArray[i][0] as string;
          if (typeof name !== "string" || seen.has(name)) continue;
          seen.add(name);
          const c0 = apply(ctm, 0, 0), c1 = apply(ctm, 1, 0), c2 = apply(ctm, 0, 1);
          const drawnW = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]);
          const drawnH = Math.hypot(c2[0] - c0[0], c2[1] - c0[1]);
          if (drawnW < MIN_DRAWN || drawnH < MIN_DRAWN) continue;
          const topPdf = Math.max(c0[1], c1[1], c2[1], apply(ctm, 1, 1)[1]);
          const yTop = vpH - topPdf;
          if (results.length >= MAX_IMAGES) break;

          const obj = (await getObj(pg.objs, name)) as ImgObj | null;
          if (!obj || !obj.data || !obj.width || !obj.height) continue;
          if (obj.width < MIN_SRC || obj.height < MIN_SRC) continue;
          if (![1, 2, 3].includes(obj.kind)) continue;
          try {
            const { data, width, height } = toRgbaScaled(obj.data, obj.width, obj.height, obj.kind);
            const png = encodePng(width, height, data);
            const file = `${p}-${name.replace(/[^a-z0-9_]/gi, "")}.png`;
            await fs.writeFile(path.join(outDir, file), png);
            results.push({ page: p, y: yTop, drawnW, drawnH, url: `${urlBase}/${file}`, width, height });
          } catch { /* skip this image */ }
        }
      }
      pg.cleanup();
    } catch { /* skip whole page */ }
  }
  return results;
}
