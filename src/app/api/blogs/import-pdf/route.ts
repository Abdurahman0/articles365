import path from "node:path";
import { getAdmin, forbidden } from "@/server/auth";
import { pdfToBlogDocument } from "@/server/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB

const bad = (message: string, status = 400) => Response.json({ error: message }, { status });

// never trust the uploaded filename — strip any path components
const safeName = (name: string) =>
  (name.split(/[\\/]/).pop() || "document.pdf").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document.pdf";

export async function POST(req: Request) {
  if (!getAdmin(req)) return forbidden();

  let form: FormData;
  try { form = await req.formData(); } catch { return bad("Invalid upload payload."); }

  const file = form.get("file");
  if (!(file instanceof Blob)) return bad("No PDF file was provided.");
  const name = file instanceof File ? file.name : "document.pdf";

  if (!/\.pdf$/i.test(name) && file.type && file.type !== "application/pdf")
    return bad("Only .pdf files are allowed.");
  if (file.size === 0) return bad("The uploaded file is empty.");
  if (file.size > MAX_BYTES) return bad("PDF is too large (max 30 MB).", 413);

  const buf = new Uint8Array(await file.arrayBuffer());
  // verify the magic header "%PDF"
  if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46))
    return bad("This file is not a valid PDF.");

  try {
    const document = await pdfToBlogDocument(buf, {
      fileName: safeName(name),
      imageOutDir: path.join(process.cwd(), "public", "blog-media", "import"),
      imageUrlBase: "/blog-media/import",
    });
    if (!document.blocks.length) return bad("No readable content could be extracted from this PDF.", 422);
    return Response.json({ document });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/password|encrypt/i.test(msg)) return bad("This PDF is password-protected and cannot be read.", 422);
    if (/No selectable text/i.test(msg)) return bad(msg, 422);
    if (/Invalid PDF|corrupt|structure/i.test(msg)) return bad("This PDF appears to be corrupted.", 422);
    return Response.json({ error: "Could not parse this PDF.", detail: msg.slice(0, 200) }, { status: 422 });
  }
}
