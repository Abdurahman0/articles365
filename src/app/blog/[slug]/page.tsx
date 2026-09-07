import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { blogStore } from "@/server/blog-store";
import { BlogArticle } from "@/components/blog/blog-renderer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await blogStore.get(slug).catch(() => null);
  if (!blog || blog.status !== "published") return { title: "Article not found" };
  return { title: blog.title, description: blog.subtitle ?? undefined };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await blogStore.get(slug).catch(() => null);
  if (!blog || blog.status !== "published") notFound();

  const published = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> All articles
        </Link>
        {published && <span className="text-xs text-muted-foreground">{published}</span>}
      </div>

      <BlogArticle document={blog.content} />

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <Link href="/blog" className="text-primary hover:underline">← Back to all articles</Link>
      </footer>
    </div>
  );
}
