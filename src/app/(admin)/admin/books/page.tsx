"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { adminApi } from "@/services/admin.api";
import { ACCESS_GRANTS } from "@/data/access";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/books/book-cover";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookStatus } from "@/types";

export default function AdminBooks() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "books"], queryFn: adminApi.books });
  const [q, setQ] = useState("");
  const [statuses, setStatuses] = useState<Record<string, BookStatus>>({});

  const books = useMemo(() => {
    let l = data ?? [];
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((b) => `${b.title} ${b.author ?? ""}`.toLowerCase().includes(t)); }
    return l;
  }, [data, q]);

  const usersWith = (bookId: string) => ACCESS_GRANTS.filter((g) => g.bookId === bookId && g.status === "active").length;
  const statusOf = (id: string, s: BookStatus) => statuses[id] ?? s;

  return (
    <div>
      <PageHeader
        title="Books"
        description="Manage the catalog, files and availability."
        action={<Button asChild><Link href="/admin/books/new"><Plus className="size-4" /> New book</Link></Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books…"
          className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const st = statusOf(b.id, b.status as BookStatus);
            return (
              <Card key={b.id} className="flex gap-3 p-3">
                <div className="w-14 shrink-0"><BookCover book={{ title: b.title, author: b.author ?? "Unknown", coverColor: coverFor(b.id), category: b.category ?? { id: "x", name: "—", slug: "x" } }} size="sm" className="!p-2" /></div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/admin/books/${b.id}`} className="truncate text-sm font-semibold hover:text-primary">{b.title}</Link>
                  <p className="truncate text-xs text-muted-foreground">{b.author} · {b.category?.name ?? "—"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={st === "active" ? "success" : "outline"}>{st}</Badge>
                    <span className="text-[11px] text-muted-foreground">{usersWith(b.id)} with access</span>
                  </div>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs"><Link href={`/admin/books/${b.id}`}>Edit</Link></Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setStatuses((s) => ({ ...s, [b.id]: st === "active" ? "inactive" : "active" }))}>
                      {st === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function coverFor(id: string): [string, string] {
  const palette: [string, string][] = [["#1b2a4a", "#0a1122"], ["#2a1b3d", "#120a1c"], ["#123028", "#07130f"], ["#3a2f12", "#1c1607"]];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}
