"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookMarked, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAnnotations } from "@/stores/annotations";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate } from "@/lib/utils";

export default function BookmarksPage() {
  const mounted = useMounted();
  const bookmarks = useAnnotations((s) => s.bookmarks);
  const remove = useAnnotations((s) => s.removeBookmark);
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const list = q.trim()
      ? bookmarks.filter((b) => `${b.label ?? ""} ${b.bookTitle}`.toLowerCase().includes(q.toLowerCase()))
      : bookmarks;
    const map = new Map<string, typeof bookmarks>();
    for (const b of list) map.set(b.bookTitle, [...(map.get(b.bookTitle) ?? []), b]);
    return [...map.entries()];
  }, [bookmarks, q]);

  return (
    <div>
      <PageHeader title="Bookmarks" description="Saved pages you can jump straight back to." />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookmarks…"
          className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
      </div>

      {!mounted ? null : grouped.length === 0 ? (
        <EmptyState icon={BookMarked} title="No bookmarks yet" description="Tap the bookmark icon while reading to save a page here." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([title, items]) => (
            <div key={title}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
              <div className="space-y-2">
                {items.sort((a, b) => a.page - b.page).map((b) => (
                  <Card key={b.id} className="group flex items-center justify-between p-4">
                    <Link href={`/reader/${b.bookId}?p=${b.page}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium hover:text-primary">🔖 {b.label ?? `Page ${b.page}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">p.{b.page}</span>
                      <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => remove(b.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
