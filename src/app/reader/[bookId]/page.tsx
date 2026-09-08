"use client";

import { use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getBookById } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const IssuePages = dynamic(
  () => import("@/components/reader/issue-pages").then((m) => m.IssuePages),
  { ssr: false, loading: () => <div className="grid min-h-[50vh] place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div> }
);

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const book = getBookById(bookId);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {!book?.pdf ? (
          <div className="grid min-h-[60vh] place-items-center px-4 text-center">
            <div>
              <p className="text-lg font-semibold">This book isn&apos;t available to read yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Only the featured issue is readable in this demo.</p>
              <Button asChild className="mt-6"><Link href="/books">Back to books</Link></Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <Link href="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" /> Books
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{book.author} · {book.pageCount} pages</p>

            {/* every PDF page rendered as an image, stacked edge-to-edge */}
            <div className="mt-5">
              <IssuePages pdfUrl={book.pdf} storageKey={book.id} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
