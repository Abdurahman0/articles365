import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { BOOKS, CATEGORIES } from "@/data/catalog";
import { BookCover } from "@/components/books/book-cover";

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="eyebrow text-primary">Browse</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Categories</h1>
        <p className="mt-3 text-muted-foreground">Find your next read by subject.</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const sample = BOOKS.filter((b) => b.category.slug === c.slug).slice(0, 3);
          return (
            <Link key={c.id} href={`/categories/${c.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <div>
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
                <h2 className="mt-4 text-lg font-semibold group-hover:text-primary">{c.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div className="flex -space-x-3">
                  {sample.map((b) => (
                    <div key={b.id} className="w-10 overflow-hidden rounded ring-2 ring-card"><BookCover book={b} size="sm" className="!p-1.5" /></div>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                  {c.bookCount} titles <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
