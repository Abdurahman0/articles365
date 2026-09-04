import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Info, Lock, ShieldCheck } from "lucide-react";
import { BOOKS, getBookBySlug } from "@/data/catalog";
import { BookCover } from "@/components/books/book-cover";
import { BookCard } from "@/components/books/book-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return BOOKS.map((b) => ({ slug: b.slug }));
}

export default async function BookDetailPublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();

  const related = BOOKS.filter((b) => b.category.slug === book.category.slug && b.id !== book.id).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link href="/books" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All books
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mx-auto max-w-64 lg:max-w-none">
            <div className="glow-gold rounded-xl"><BookCover book={book} size="lg" /></div>
          </div>
        </div>

        <div>
          <Badge variant="primary">{book.category.name}</Badge>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{book.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">by {book.author} · {book.year} · {book.pageCount} pages</p>

          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-foreground/80">{book.description}</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/70">
            Available exclusively through the Articles365 protected reader. Once access is granted, this
            title appears in your personal library with your progress, notes and highlights synced.
          </p>

          {/* Access flow */}
          <Card className="mt-8 max-w-xl p-6">
            <div className="flex items-center gap-2 text-primary"><Info className="size-4" /><span className="text-sm font-semibold">How to get access</span></div>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><Step n={1} /> Create your Articles365 account.</li>
              <li className="flex gap-3"><Step n={2} /> Complete payment externally and share your confirmation.</li>
              <li className="flex gap-3"><Step n={3} /> An admin grants access — the book appears in <span className="text-foreground">My Library</span>.</li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href="/register">Create account</Link></Button>
              <Button asChild variant="outline"><Link href="/login">I already have access</Link></Button>
            </div>
          </Card>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Protected reader</span>
            <span className="flex items-center gap-2"><Lock className="size-4 text-primary" /> No downloadable file</span>
            <span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Notes & highlights</span>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-semibold tracking-tight">More in {book.category.name}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((b) => <BookCard key={b.id} book={b} href={`/books/${b.slug}`} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">{n}</span>;
}
