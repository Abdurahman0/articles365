"use client";

import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookMarked, Highlighter, Play, StickyNote } from "lucide-react";
import { libraryApi } from "@/services/library.api";
import { BookCover } from "@/components/books/book-cover";
import { ReadingStatusBadge } from "@/components/books/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnnotations } from "@/stores/annotations";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate, timeAgo } from "@/lib/utils";
import type { HighlightColor } from "@/types";

const HL_DOT: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400", orange: "bg-orange-400", green: "bg-green-400", blue: "bg-blue-400", pink: "bg-pink-400",
};

export default function BookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const router = useRouter();
  const mounted = useMounted();
  const { data: book, isLoading } = useQuery({ queryKey: ["book", bookId], queryFn: () => libraryApi.get(bookId) });
  const highlights = useAnnotations((s) => s.highlights).filter((h) => h.bookId === bookId);
  const bookmarks = useAnnotations((s) => s.bookmarks).filter((b) => b.bookId === bookId);
  const notes = useAnnotations((s) => s.notes).filter((n) => n.bookId === bookId);

  if (isLoading) return <DetailSkeleton />;
  if (!book) {
    return (
      <EmptyState icon={BookMarked} title="Book not found" description="This book isn't in your library."
        action={<Button asChild><Link href="/library">Back to library</Link></Button>} />
    );
  }

  const counts = mounted
    ? { h: highlights.length, b: bookmarks.length, n: notes.length }
    : { h: book.highlightsCount, b: book.bookmarksCount, n: book.notesCount };

  return (
    <div>
      <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Cover + actions */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mx-auto max-w-56 lg:max-w-none">
            <BookCover book={book} size="lg" className="shadow-2xl" />
          </div>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={`/reader/${book.id}`}>
              <Play className="size-4" /> {book.progress > 0 ? "Continue reading" : "Start reading"}
            </Link>
          </Button>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[{ icon: Highlighter, v: counts.h, l: "Highlights" }, { icon: BookMarked, v: counts.b, l: "Bookmarks" }, { icon: StickyNote, v: counts.n, l: "Notes" }].map((s) => (
              <Card key={s.l} className="p-3">
                <s.icon className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-1.5 text-lg font-semibold tabular-nums">{s.v}</p>
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Info + tabs */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{book.category.name}</span>
            <ReadingStatusBadge status={book.readingStatus} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{book.title}</h1>
          <p className="mt-1 text-muted-foreground">by {book.author} · {book.year} · {book.pageCount} pages</p>

          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(book.progress)}% complete · page {book.lastPage}</span>
              {book.lastReadAt && <span>Last read {timeAgo(book.lastReadAt)}</span>}
            </div>
            <Progress value={book.progress} />
          </div>

          <Tabs defaultValue="overview" className="mt-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
              <TabsTrigger value="highlights">Highlights</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="prose-invert max-w-none space-y-4 text-[15px] leading-relaxed text-foreground/80">
                <p>{book.description}</p>
                <p>
                  This edition is available exclusively through the Articles365 protected reader. The
                  original file is never exposed — you read inside a secure, watermarked interface with
                  your highlights, notes and progress saved to your account.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="bookmarks">
              {mounted && bookmarks.length ? (
                <div className="space-y-2">
                  {bookmarks.map((b) => (
                    <Link key={b.id} href={`/reader/${book.id}?p=${b.page}`}>
                      <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                        <div><p className="text-sm font-medium">{b.label ?? `Page ${b.page}`}</p><p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p></div>
                        <span className="text-xs text-muted-foreground">p.{b.page}</span>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : <EmptyState icon={BookMarked} title="No bookmarks yet" description="Bookmark pages while reading to find them here." />}
            </TabsContent>

            <TabsContent value="highlights">
              {mounted && highlights.length ? (
                <div className="space-y-2">
                  {highlights.map((h) => (
                    <Link key={h.id} href={`/reader/${book.id}?p=${h.page}`}>
                      <Card className="p-4 transition-colors hover:border-primary/40">
                        <div className="flex gap-3">
                          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${HL_DOT[h.color]}`} />
                          <div><p className="text-sm">{h.text}</p><p className="mt-1 text-xs text-muted-foreground">Page {h.page} · {formatDate(h.createdAt)}</p></div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : <EmptyState icon={Highlighter} title="No highlights yet" description="Select text in the reader to highlight it." />}
            </TabsContent>

            <TabsContent value="notes">
              {mounted && notes.length ? (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <Link key={n.id} href={`/reader/${book.id}?p=${n.page}`}>
                      <Card className="p-4 transition-colors hover:border-primary/40">
                        {n.title && <p className="text-sm font-semibold">{n.title}</p>}
                        <p className="mt-0.5 text-sm text-foreground/80">{n.content}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">Page {n.page} · {formatDate(n.updatedAt)}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : <EmptyState icon={StickyNote} title="No notes yet" description="Write notes while reading to keep your thinking." />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      <Skeleton className="mx-auto aspect-[3/4] w-56 rounded-lg lg:w-full" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-2 w-1/2" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
