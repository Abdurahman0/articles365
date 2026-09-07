import { getAdmin, forbidden } from "@/server/auth";
import { blogStore } from "@/server/blog-store";
import type { BlogDocument } from "@/types/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/blogs/:idOrSlug — public can read published; admins read any
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const blog = await blogStore.get(id);
  if (!blog) return Response.json({ error: "Not found." }, { status: 404 });
  if (blog.status !== "published" && !getAdmin(req)) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ blog });
}

// PATCH /api/blogs/:id — update content / status / slug (admin only)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!getAdmin(req)) return forbidden();
  const { id } = await ctx.params;
  let body: { document?: BlogDocument; status?: "draft" | "published"; slug?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }

  if (body.document && (typeof body.document.title !== "string" || !Array.isArray(body.document.blocks)))
    return Response.json({ error: "Invalid document." }, { status: 400 });

  const blog = await blogStore.update(id, {
    content: body.document,
    status: body.status,
    slug: body.slug,
  });
  if (!blog) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ blog });
}
