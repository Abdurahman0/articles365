"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookText, KeyRound, MonitorSmartphone, UserCheck, Users } from "lucide-react";
import { adminApi } from "@/services/admin.api";
import { StatCard } from "@/components/admin/stat-card";
import { AccountStatusBadge } from "@/components/admin/account-status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, initials } from "@/lib/utils";

export default function AdminDashboard() {
  const metrics = useQuery({ queryKey: ["admin", "metrics"], queryFn: adminApi.metrics });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const books = useQuery({ queryKey: ["admin", "books"], queryFn: adminApi.books });
  const access = useQuery({ queryKey: ["admin", "access"], queryFn: adminApi.accessGrants });

  const m = metrics.data;
  const stats = [
    { label: "Total users", value: m?.totalUsers ?? "—", icon: Users },
    { label: "Active users", value: m?.activeUsers ?? "—", icon: UserCheck },
    { label: "Total books", value: m?.totalBooks ?? "—", icon: BookText },
    { label: "Active books", value: m?.activeBooks ?? "—", icon: BookText },
    { label: "Access grants", value: m?.accessGrants ?? "—", icon: KeyRound },
    { label: "Active sessions", value: m?.activeSessions ?? "—", icon: MonitorSmartphone },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview and recent activity." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : stats.map((s) => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />)}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-sm font-semibold">Recent users</h3>
            <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-primary">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {(users.data ?? []).slice(0, 5).map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/40">
                <Avatar className="size-9"><AvatarFallback className="text-xs">{initials(u.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{u.fullName}</p><p className="truncate text-xs text-muted-foreground">{u.email ?? u.phone}</p></div>
                <AccountStatusBadge status={u.status} />
              </Link>
            ))}
            {users.isLoading && <div className="p-4"><Skeleton className="h-10" /></div>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-sm font-semibold">Recent access actions</h3>
            <Link href="/admin/access" className="text-xs text-muted-foreground hover:text-primary">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {(access.data ?? []).slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center gap-3 p-4">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><KeyRound className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{g.userName}</p><p className="truncate text-xs text-muted-foreground">{g.bookTitle} · {formatDate(g.grantedAt)}</p></div>
                <Badge variant={g.status === "active" ? "success" : "outline"}>{g.status}</Badge>
              </div>
            ))}
            {access.isLoading && <div className="p-4"><Skeleton className="h-10" /></div>}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-semibold">Recently added books</h3>
          <Link href="/admin/books" className="text-xs text-muted-foreground hover:text-primary">Manage books</Link>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(books.data ?? []).slice(0, 6).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{b.title}</p><p className="truncate text-xs text-muted-foreground">{b.category?.name}</p></div>
              <Badge variant={b.status === "active" ? "success" : "outline"}>{b.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
