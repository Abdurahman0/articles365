import Link from "next/link";
import { Plus } from "lucide-react";
import { blogStore } from "@/server/blog-store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blog" };

export default async function BlogIndexPage() {
  const blogs = await blogStore.list({ status: "published" }).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">Reading room</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Blog</h1>
          <p className="mt-3 text-muted-foreground">Articles converted from PDFs into readable, structured stories.</p>
        </div>
        <Link href="/admin/blog/create" className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-4 py-2.5 text-sm font-semibold shadow-primary">
          <Plus className="size-4" /> New from PDF
        </Link>
      </div>

      {blogs.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No articles yet. Create one from a PDF to get started.
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((b) => (
            <Link key={b.id} href={`/blog/${b.slug}`}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <div className="aspect-[16/10] w-full overflow-hidden bg-secondary/50">
                {b.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverImage} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground/40">No cover</div>
                )}
              </div>
              <div className="p-5">
                <h2 className="line-clamp-2 font-serif text-lg font-semibold leading-snug tracking-tight">{b.title}</h2>
                {b.subtitle && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{b.subtitle}</p>}
                {b.author && <p className="mt-3 text-xs font-medium text-foreground/60">By {b.author}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
