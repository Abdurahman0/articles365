"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BookCover } from "./book-cover";
import { ReadingStatusBadge } from "./status-badge";
import { Progress } from "@/components/ui/progress";
import type { Book, OwnedBook } from "@/types";
import { cn } from "@/lib/utils";

function isOwned(b: Book | OwnedBook): b is OwnedBook {
  return "progress" in b;
}

export function BookCard({
  book,
  href,
  className,
}: {
  book: Book | OwnedBook;
  href: string;
  className?: string;
}) {
  const owned = isOwned(book);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("group", className)}
    >
      <Link
        href={href}
        className="flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
      >
        <div className="relative">
          <BookCover book={book} size="sm" className="transition-transform duration-500 group-hover:scale-[1.015]" />
          <div className="pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <ArrowUpRight className="size-3.5" />
          </div>
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          <p className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {book.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{book.author}</p>

          {owned ? (
            <div className="mt-auto pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <ReadingStatusBadge status={book.readingStatus} />
                <span className="text-[11px] text-muted-foreground">{Math.round(book.progress)}%</span>
              </div>
              <Progress value={book.progress} />
            </div>
          ) : (
            <div className="mt-auto pt-3">
              <span className="text-[11px] text-muted-foreground">{book.category.name} · {book.pageCount} pp</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
