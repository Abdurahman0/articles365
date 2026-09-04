"use client";

import { use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { getBookById } from "@/data/catalog";
import { Button } from "@/components/ui/button";

const PdfBookReader = dynamic(
  () => import("@/components/reader/pdf-book-reader").then((m) => m.PdfBookReader),
  {
    ssr: false,
    loading: () => (
      <div className="reader-desk grid min-h-dvh place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    ),
  }
);

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const book = getBookById(bookId);

  if (!book?.pdf) {
    return (
      <div className="reader-desk grid min-h-dvh place-items-center px-4 text-center text-zinc-200">
        <div>
          <p className="text-lg font-semibold">This book isn&apos;t available to read yet.</p>
          <p className="mt-1 text-sm text-zinc-400">Only the featured issue is readable in this demo.</p>
          <Button asChild className="mt-6"><Link href="/books">Back to books</Link></Button>
        </div>
      </div>
    );
  }

  return <PdfBookReader pdfUrl={book.pdf} title={book.title} storageKey={book.id} />;
}
