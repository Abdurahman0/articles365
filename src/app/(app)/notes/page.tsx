"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, StickyNote, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAnnotations } from "@/stores/annotations";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate } from "@/lib/utils";

export default function NotesPage() {
  const mounted = useMounted();
  const notes = useAnnotations((s) => s.notes);
  const remove = useAnnotations((s) => s.removeNote);
  const [q, setQ] = useState("");
  const [book, setBook] = useState("all");

  const books = useMemo(() => [...new Set(notes.map((n) => n.bookTitle))], [notes]);
  const list = useMemo(() => {
    let l = notes;
    if (book !== "all") l = l.filter((n) => n.bookTitle === book);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((n) => `${n.title ?? ""} ${n.content} ${n.bookTitle}`.toLowerCase().includes(t)); }
    return l;
  }, [notes, book, q]);

  return (
    <div>
      <PageHeader title="Notes" description="Your thinking, linked to the exact page it came from." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…"
            className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <select value={book} onChange={(e) => setBook(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card/60 px-3 text-sm outline-none focus:border-primary/50">
          <option value="all">All books</option>
          {books.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {!mounted ? null : list.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Add a note in the reader — from selected text or the current page." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((n) => (
            <Card key={n.id} className="group p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/reader/${n.bookId}?p=${n.page}`} className="min-w-0 flex-1">
                  {n.title && <p className="text-sm font-semibold hover:text-primary">{n.title}</p>}
                  {n.quote && <p className="mb-1.5 border-l-2 border-primary/50 pl-2 text-xs italic text-muted-foreground line-clamp-2">“{n.quote}”</p>}
                  <p className="text-sm text-foreground/85">{n.content}</p>
                </Link>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => remove(n.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">{n.bookTitle} · Page {n.page} · {formatDate(n.updatedAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
