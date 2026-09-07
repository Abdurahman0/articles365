import { getAdmin, forbidden } from "@/server/auth";
import { blogStore } from "@/server/blog-store";
import type { BlogDocument } from "@/types/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/blogs — public sees published; admins see everything (or ?status=)
export async function GET(req: Request) {
  const admin = getAdmin(req);
  const status = new URL(req.url).searchParams.get("status") as "draft" | "published" | null;
  if (!admin) return Response.json({ blogs: await blogStore.list({ status: "published" }) });
  return Response.json({ blogs: await blogStore.list(status ? { status } : undefined) });
}

// POST /api/blogs — create (admin only)
export async function POST(req: Request) {
  if (!getAdmin(req)) return forbidden();
  let body: { document?: BlogDocument; status?: "draft" | "published"; sourcePdf?: string; slug?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const doc = body.document;
  if (!doc || typeof doc.title !== "string" || !Array.isArray(doc.blocks))
    return Response.json({ error: "A valid document is required." }, { status: 400 });

  const blog = await blogStore.create({
    content: doc,
    status: body.status === "published" ? "published" : "draft",
    sourcePdf: body.sourcePdf,
    slug: body.slug,
  });
  return Response.json({ blog }, { status: 201 });
}
