"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBookById } from "@/data/catalog";
import { Button } from "@/components/ui/button";

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const book = getBookById(bookId);

  if (!book?.pdf) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold">This book isn&apos;t available to read yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Only the featured issue is readable in this demo.</p>
          <Button asChild className="mt-6"><Link href="/books">Back to books</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="z-10 flex h-12 items-center gap-2 border-b border-border bg-card px-3">
        <Link href="/books" aria-label="Back to books" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ChevronLeft className="size-4" /> Books
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{book.title}</span>
      </header>
      {/* the actual PDF, rendered by the browser's built-in viewer inside the site */}
      <iframe
        src={`${book.pdf}#view=FitH`}
        title={book.title}
        className="min-h-0 flex-1 border-0"
      />
    </div>
  );
}
