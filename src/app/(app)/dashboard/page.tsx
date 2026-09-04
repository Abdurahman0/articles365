"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight, BookMarked, BookOpen, CheckCircle2, Highlighter, Play, StickyNote,
} from "lucide-react";
import { libraryApi } from "@/services/library.api";
import { annotationsApi } from "@/services/annotations.api";
import { BookCover } from "@/components/books/book-cover";
import { BookListItem } from "@/components/books/book-list-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const library = useQuery({ queryKey: ["library"], queryFn: libraryApi.list });
  const notes = useQuery({ queryKey: ["notes"], queryFn: annotationsApi.notes });
  const bookmarks = useQuery({ queryKey: ["bookmarks"], queryFn: annotationsApi.bookmarks });

  const books = library.data ?? [];
  const reading = [...books]
    .filter((b) => b.readingStatus === "reading")
    .sort((a, b) => +new Date(b.lastReadAt ?? 0) - +new Date(a.lastReadAt ?? 0));
  const current = reading[0];

  const stats = [
    { label: "In library", value: books.length, icon: BookOpen },
    { label: "Started", value: books.filter((b) => b.readingStatus === "reading").length, icon: Play },
    { label: "Completed", value: books.filter((b) => b.readingStatus === "completed").length, icon: CheckCircle2 },
    { label: "Bookmarks", value: bookmarks.data?.length ?? 0, icon: BookMarked },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {user?.fullName?.split(" ")[0] ?? "reader"}.
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold tabular-nums">{library.isLoading ? "—" : s.value}</span>
                <s.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Continue reading */}
      <section>
        <SectionHead title="Continue reading" href="/library" />
        {library.isLoading ? (
          <Skeleton className="h-44 w-full rounded-2xl" />
        ) : current ? (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <div className="w-24 shrink-0 sm:w-28">
                <BookCover book={current} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{current.category.name}</p>
                <h3 className="mt-0.5 text-lg font-semibold">{current.title}</h3>
                <p className="text-sm text-muted-foreground">{current.author}</p>
                <div className="mt-4 max-w-md">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(current.progress)}% · page {current.lastPage}</span>
                    <span>Last read {timeAgo(current.lastReadAt ?? "")}</span>
                  </div>
                  <Progress value={current.progress} />
                </div>
              </div>
              <Button asChild size="lg" className="sm:self-center">
                <Link href={`/reader/${current.id}`}><Play className="size-4" /> Resume</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nothing in progress. <Link href="/library" className="text-primary hover:underline">Open your library</Link>.
          </Card>
        )}
      </section>

      {/* Library preview */}
      <section>
        <SectionHead title="My library" href="/library" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {library.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)
            : books.slice(0, 4).map((b) => (
                <Link key={b.id} href={`/library/${b.id}`} className="group">
                  <BookCover book={b} size="sm" className="transition-transform group-hover:-translate-y-1" />
                  <p className="mt-2 line-clamp-1 text-sm font-medium group-hover:text-primary">{b.title}</p>
                  <Progress value={b.progress} className="mt-1.5" />
                </Link>
              ))}
        </div>
      </section>

      {/* Recent notes + bookmarks */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <SectionHead title="Recent notes" href="/notes" icon={StickyNote} />
          <div className="space-y-2">
            {(notes.data ?? []).slice(0, 3).map((n) => (
              <Card key={n.id} className="p-4">
                <p className="line-clamp-2 text-sm">{n.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{n.bookTitle} · p.{n.page}</p>
              </Card>
            ))}
            {notes.isLoading && <Skeleton className="h-20 rounded-xl" />}
          </div>
        </section>
        <section>
          <SectionHead title="Recent bookmarks" href="/bookmarks" icon={BookMarked} />
          <div className="space-y-2">
            {(bookmarks.data ?? []).slice(0, 3).map((b) => (
              <Link key={b.id} href={`/reader/${b.bookId}?p=${b.page}`}>
                <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.label ?? `Page ${b.page}`}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.bookTitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">p.{b.page}</span>
                </Card>
              </Link>
            ))}
            {bookmarks.isLoading && <Skeleton className="h-20 rounded-xl" />}
          </div>
        </section>
      </div>

      {/* Recently read list */}
      <section>
        <SectionHead title="Recently read" href="/library" icon={Highlighter} />
        <div className="space-y-2">
          {reading.slice(0, 3).map((b) => (
            <BookListItem key={b.id} book={b} href={`/library/${b.id}`} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, href, icon: Icon }: { title: string; href: string; icon?: typeof ArrowRight }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-4" />} {title}
      </h2>
      <Link href={href} className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
        View all <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
