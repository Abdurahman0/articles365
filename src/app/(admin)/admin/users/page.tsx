"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { adminApi } from "@/services/admin.api";
import { ACCESS_GRANTS } from "@/data/access";
import { ADMIN_SESSIONS } from "@/data/sessions";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/admin/account-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, initials } from "@/lib/utils";

const PAGE_SIZE = 6;

export default function AdminUsers() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let l = data ?? [];
    if (status !== "all") l = l.filter((u) => u.status === status);
    if (q.trim()) { const t = q.toLowerCase(); l = l.filter((u) => `${u.fullName} ${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase().includes(t)); }
    return l;
  }, [data, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const booksOf = (id: string) => ACCESS_GRANTS.filter((g) => g.userId === id && g.status === "active").length;
  const sessOf = (id: string) => ADMIN_SESSIONS.filter((s) => s.userId === id).length;

  return (
    <div>
      <PageHeader title="Users" description="Manage accounts, access and sessions." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search users…"
            className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "blocked"] as const).map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(0); }}
              className={cn("rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                status === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Books</th>
                <th className="px-4 py-3 font-medium">Sessions</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8" /></td></tr>
                  ))
                : rows.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                          <Avatar className="size-8"><AvatarFallback className="text-[11px]">{initials(u.fullName)}</AvatarFallback></Avatar>
                          <div><p className="font-medium hover:text-primary">{u.fullName}</p><p className="text-xs capitalize text-muted-foreground">{u.role}</p></div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? u.phone}</td>
                      <td className="px-4 py-3"><AccountStatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 tabular-nums">{booksOf(u.id)}</td>
                      <td className="px-4 py-3 tabular-nums">{sessOf(u.id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{filtered.length} users</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid size-7 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <span>{page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="grid size-7 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}
