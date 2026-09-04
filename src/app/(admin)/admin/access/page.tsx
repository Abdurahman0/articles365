"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ACCESS_GRANTS } from "@/data/access";
import { ADMIN_USERS, getUserById } from "@/data/users";
import { BOOKS, getBookById } from "@/data/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { formatDate } from "@/lib/utils";
import type { AccessGrant } from "@/types";

export default function AdminAccess() {
  const [grants, setGrants] = useState<AccessGrant[]>(() => [...ACCESS_GRANTS]);
  const [userId, setUserId] = useState("");
  const [bookId, setBookId] = useState("");
  const [revoke, setRevoke] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function grant() {
    const u = getUserById(userId), b = getBookById(bookId);
    if (!u || !b) return;
    if (grants.some((g) => g.userId === userId && g.bookId === bookId && g.status === "active")) {
      setMsg("That user already has active access to this book.");
      return;
    }
    setGrants([{ id: `ag-${Date.now()}`, userId, userName: u.fullName, bookId, bookTitle: b.title, grantedBy: "You", grantedAt: new Date().toISOString(), status: "active" }, ...grants]);
    setMsg("Access granted ✓");
    setUserId(""); setBookId("");
  }

  return (
    <div>
      <PageHeader title="Access management" description="Grant and revoke book access after external payment is confirmed." />

      {/* Grant */}
      <Card className="mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>User</Label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary/50">
              <option value="">Select user…</option>
              {ADMIN_USERS.filter((u) => u.role === "user").map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email ?? u.phone})</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Book</Label>
            <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary/50">
              <option value="">Select book…</option>
              {BOOKS.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
          <Button onClick={grant} disabled={!userId || !bookId}><KeyRound className="size-4" /> Grant</Button>
        </div>
        {msg && <p className="mt-3 text-xs text-primary">{msg}</p>}
      </Card>

      {/* Records */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Book</th><th className="px-4 py-3 font-medium">Granted</th><th className="px-4 py-3 font-medium">By</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grants.map((g) => (
                <tr key={g.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{g.userName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.bookTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(g.grantedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.grantedBy}</td>
                  <td className="px-4 py-3"><Badge variant={g.status === "active" ? "success" : "outline"}>{g.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {g.status === "active" && <Button variant="ghost" size="sm" onClick={() => setRevoke(g.id)}>Revoke</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog open={!!revoke} onOpenChange={(v) => !v && setRevoke(null)}
        title="Revoke access?" description="The user will immediately lose access to this book."
        confirmLabel="Revoke" onConfirm={() => setGrants(grants.map((g) => (g.id === revoke ? { ...g, status: "revoked" } : g)))} />
    </div>
  );
}
