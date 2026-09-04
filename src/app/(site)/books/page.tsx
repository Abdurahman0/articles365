"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Lock, Sparkles } from "lucide-react";
import { FEATURED_PDF_BOOK } from "@/data/catalog";
import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BooksPage() {
  const book = FEATURED_PDF_BOOK;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="eyebrow text-primary">Reading room</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Books</h1>
        <p className="mt-3 text-muted-foreground">
          Open the featured issue and read it in a real, flip-through book.
        </p>
      </div>

      {/* Featured readable book */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 grid gap-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:grid-cols-[280px_1fr] lg:items-center"
      >
        <div className="mx-auto w-48 lg:w-full">
          <Link href={`/reader/${book.id}`} className="block glow-gold rounded-xl">
            <BookCover book={book} size="lg" />
          </Link>
        </div>
        <div>
          <Badge variant="primary"><Sparkles className="size-3" /> Featured issue</Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h2>
          <p className="mt-1 text-muted-foreground">{book.author} · {book.pageCount} pages</p>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground/80">{book.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href={`/reader/${book.id}`}><BookOpen className="size-4" /> Read the issue</Link></Button>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 text-primary" /> Read inside the protected flip-book reader — no download.
          </div>
        </div>
      </motion.div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        More issues coming soon.
      </p>
    </div>
  );
}
