"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Highlighter, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAnnotations } from "@/stores/annotations";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate } from "@/lib/utils";
import type { HighlightColor } from "@/types";

const HL: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400", orange: "bg-orange-400", green: "bg-green-400", blue: "bg-blue-400", pink: "bg-pink-400",
};
const COLORS: (HighlightColor | "all")[] = ["all", "yellow", "orange", "green", "blue", "pink"];

export default function HighlightsPage() {
  const mounted = useMounted();
  const highlights = useAnnotations((s) => s.highlights);
  const remove = useAnnotations((s) => s.removeHighlight);
  const [q, setQ] = useState("");
  const [color, setColor] = useState<HighlightColor | "all">("all");

  const list = useMemo(() => {
    let l = highlights;
    if (color !== "all") l = l.filter((h) => h.color === color);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((h) => `${h.text} ${h.bookTitle}`.toLowerCase().includes(t)); }
    return l;
  }, [highlights, color, q]);

  return (
    <div>
      <PageHeader title="Highlights" description="Every passage you've marked, across your library." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search highlights…"
            className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`grid size-8 place-items-center rounded-lg border transition-colors ${color === c ? "border-primary/50 bg-secondary" : "border-border"}`}>
              {c === "all" ? <span className="text-[10px] text-muted-foreground">All</span> : <span className={`size-3.5 rounded-full ${HL[c]}`} />}
            </button>
          ))}
        </div>
      </div>

      {!mounted ? null : list.length === 0 ? (
        <EmptyState icon={Highlighter} title="No highlights found" description="Select text inside the reader to create your first highlight." />
      ) : (
        <div className="space-y-2">
          {list.map((h) => (
            <Card key={h.id} className="group p-4">
              <div className="flex gap-3">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${HL[h.color]}`} />
                <div className="min-w-0 flex-1">
                  <Link href={`/reader/${h.bookId}?p=${h.page}`} className="text-sm hover:text-primary">{h.text}</Link>
                  {h.note && <p className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">{h.note}</p>}
                  <p className="mt-1.5 text-xs text-muted-foreground">{h.bookTitle} · Page {h.page} · {formatDate(h.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => remove(h.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
