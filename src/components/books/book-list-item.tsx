"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BookCover } from "./book-cover";
import { ReadingStatusBadge } from "./status-badge";
import { Progress } from "@/components/ui/progress";
import type { OwnedBook } from "@/types";

export function BookListItem({ book, href }: { book: OwnedBook; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <div className="w-14 shrink-0">
        <BookCover book={book} size="sm" className="!p-2" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-primary">{book.title}</p>
          <ReadingStatusBadge status={book.readingStatus} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {book.author} · {book.category.name}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={book.progress} className="max-w-48" />
          <span className="text-[11px] text-muted-foreground">
            {Math.round(book.progress)}% · p.{book.lastPage}
          </span>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
