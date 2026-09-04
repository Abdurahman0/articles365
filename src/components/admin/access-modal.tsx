"use client";

import { useState } from "react";
import { KeyRound, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BOOKS } from "@/data/catalog";
import { BookCover } from "@/components/books/book-cover";
import { cn } from "@/lib/utils";

export function AccessModal({
  open, onOpenChange, userName, onGrant,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userName: string;
  onGrant: (bookId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const books = BOOKS.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelected(null); setQ(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
          <DialogTitle>Grant book access</DialogTitle>
          <DialogDescription>Select a book to grant <span className="text-foreground">{userName}</span> access to.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books…"
            className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {books.map((b) => (
            <button key={b.id} onClick={() => setSelected(b.id)}
              className={cn("flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
                selected === b.id ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-secondary")}>
              <div className="w-8"><BookCover book={b} size="sm" className="!p-1" /></div>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{b.title}</p><p className="truncate text-xs text-muted-foreground">{b.author}</p></div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!selected} onClick={() => { if (selected) { onGrant(selected); onOpenChange(false); setSelected(null); } }}>
            Grant access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
