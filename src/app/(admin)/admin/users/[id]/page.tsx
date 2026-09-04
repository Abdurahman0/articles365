"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { adminApi } from "@/services/admin.api";
import { ACCESS_GRANTS } from "@/data/access";
import { ADMIN_SESSIONS } from "@/data/sessions";
import { getBookById } from "@/data/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountStatusBadge } from "@/components/admin/account-status-badge";
import { SessionCard } from "@/components/sessions/session-card";
import { AccessModal } from "@/components/admin/access-modal";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { formatDate, initials } from "@/lib/utils";
import type { AccessGrant, AccountStatus } from "@/types";

export default function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading } = useQuery({ queryKey: ["admin", "user", id], queryFn: () => adminApi.user(id) });

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [grants, setGrants] = useState<AccessGrant[]>(() => ACCESS_GRANTS.filter((g) => g.userId === id));
  const [sessions, setSessions] = useState(() => ADMIN_SESSIONS.filter((s) => s.userId === id));
  const [accessOpen, setAccessOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "block" | "revoke"; grantId?: string }>(null);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!user) return <EmptyState icon={Ban} title="User not found" action={<Button asChild><Link href="/admin/users">Back</Link></Button>} />;

  const effStatus = status ?? user.status;

  const grant = (bookId: string) => {
    const book = getBookById(bookId);
    if (!book || grants.some((g) => g.bookId === bookId && g.status === "active")) return;
    setGrants([{ id: `ag-${Date.now()}`, userId: user.id, userName: user.fullName, bookId, bookTitle: book.title, grantedBy: "You", grantedAt: new Date().toISOString(), status: "active" }, ...grants]);
  };
  const revoke = (gid: string) => setGrants(grants.map((g) => (g.id === gid ? { ...g, status: "revoked" } : g)));

  return (
    <div>
      <Link href="/admin/users" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <PageHeader
        title={user.fullName}
        description={`${user.email ?? user.phone} · joined ${formatDate(user.createdAt)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAccessOpen(true)}><KeyRound className="size-4" /> Grant access</Button>
            {effStatus === "active" ? (
              <Button variant="destructive" onClick={() => setConfirm({ kind: "block" })}><Ban className="size-4" /> Block</Button>
            ) : (
              <Button onClick={() => setStatus("active")}><ShieldCheck className="size-4" /> Unblock</Button>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="size-16"><AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(user.fullName)}</AvatarFallback></Avatar>
              <p className="mt-3 font-semibold">{user.fullName}</p>
              <div className="mt-1"><AccountStatusBadge status={effStatus} /></div>
            </div>
            <dl className="mt-6 divide-y divide-border text-sm">
              <Row label="Email" value={user.email ?? "—"} />
              <Row label="Phone" value={user.phone ?? "—"} />
              <Row label="Role" value={user.role} />
              <Row label="Books" value={String(grants.filter((g) => g.status === "active").length)} />
            </dl>
          </CardContent>
        </Card>

        {/* Books + sessions */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Books assigned</CardTitle></CardHeader>
            <CardContent>
              {grants.length ? (
                <div className="space-y-2">
                  {grants.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div><p className="text-sm font-medium">{g.bookTitle}</p><p className="text-xs text-muted-foreground">Granted {formatDate(g.grantedAt)} · {g.status}</p></div>
                      {g.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "revoke", grantId: g.id })}>
                          <Trash2 className="size-4" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="py-6 text-center text-sm text-muted-foreground">No books assigned yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sessions.length ? sessions.map((s) => (
                <SessionCard key={s.id} session={{ ...s, current: false }} onRevoke={(sid) => setSessions(sessions.filter((x) => x.id !== sid))} />
              )) : <p className="py-6 text-center text-sm text-muted-foreground">No active sessions.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <AccessModal open={accessOpen} onOpenChange={setAccessOpen} userName={user.fullName} onGrant={grant} />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.kind === "block" ? "Block this account?" : "Revoke book access?"}
        description={confirm?.kind === "block"
          ? "The user will be signed out and unable to access their library until unblocked."
          : "The user will immediately lose access to this book."}
        confirmLabel={confirm?.kind === "block" ? "Block account" : "Revoke access"}
        onConfirm={() => { if (confirm?.kind === "block") setStatus("blocked"); else if (confirm?.grantId) revoke(confirm.grantId); }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-2.5"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium capitalize">{value}</dd></div>;
}
