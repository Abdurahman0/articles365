"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Library as LibraryIcon, Search } from "lucide-react";
import { libraryApi } from "@/services/library.api";
import { CATEGORIES } from "@/data/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { BookCard } from "@/components/books/book-card";
import { BookListItem } from "@/components/books/book-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types";

const STATUSES: { value: ReadingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "new", label: "New" },
  { value: "completed", label: "Completed" },
];

export default function LibraryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: libraryApi.list });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReadingStatus | "all">("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const books = useMemo(() => {
    let list = data ?? [];
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(t));
    }
    if (status !== "all") list = list.filter((b) => b.readingStatus === status);
    if (category !== "all") list = list.filter((b) => b.category.slug === category);
    list = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "progress") return b.progress - a.progress;
      return +new Date(b.lastReadAt ?? 0) - +new Date(a.lastReadAt ?? 0);
    });
    return list;
  }, [data, q, status, category, sort]);

  return (
    <div>
      <PageHeader
        title="My Library"
        description="Books you've been granted access to. Continue where you left off."
        action={
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button onClick={() => setView("grid")} className={cn("grid size-8 place-items-center rounded-md", view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground")}><LayoutGrid className="size-4" /></button>
            <button onClick={() => setView("list")} className={cn("grid size-8 place-items-center rounded-md", view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground")}><List className="size-4" /></button>
          </div>
        }
      />

      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library…"
            className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === s.value ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {s.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card/60 px-2.5 text-xs text-foreground outline-none focus:border-primary/50">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card/60 px-2.5 text-xs text-foreground outline-none focus:border-primary/50">
              <option value="recent">Recently read</option>
              <option value="title">Title A–Z</option>
              <option value="progress">Progress</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title="You don't have any books yet"
          description="Once an admin grants you access to a book, it will appear here in your personal library."
          action={<Button asChild><Link href="/books">Browse the catalog</Link></Button>}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => <BookCard key={b.id} book={b} href={`/library/${b.id}`} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {books.map((b) => <BookListItem key={b.id} book={b} href={`/library/${b.id}`} />)}
        </div>
      )}
    </div>
  );
}
