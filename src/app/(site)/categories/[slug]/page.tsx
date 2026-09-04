import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BOOKS, CATEGORIES, getCategoryBySlug } from "@/data/catalog";
import { BookCard } from "@/components/books/book-card";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const books = BOOKS.filter((b) => b.category.slug === slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All categories
      </Link>
      <div className="mt-8 max-w-2xl">
        <p className="eyebrow text-primary">Category</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-3 text-muted-foreground">{category.description}</p>}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books.map((b) => <BookCard key={b.id} book={b} href={`/books/${b.slug}`} />)}
      </div>
    </div>
  );
}
