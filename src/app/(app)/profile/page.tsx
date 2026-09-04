"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate, initials } from "@/lib/utils";

export default function ProfilePage() {
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  if (!mounted || !user) return null;

  function startEdit() {
    setForm({ fullName: user!.fullName, email: user!.email ?? "", phone: user!.phone ?? "" });
    setEditing(true);
  }
  function save() {
    setUser({ ...user!, fullName: form.fullName, email: form.email || null, phone: form.phone || null });
    setEditing(false);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" description="Manage your personal information." />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{user.fullName}</h2>
                <Badge variant={user.status === "active" ? "success" : "destructive"}>{user.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Member since {formatDate(user.createdAt)}</p>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={startEdit}><Pencil className="size-3.5" /> Edit</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <Field label="Full name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998…" /></Field>
              <div className="flex gap-2 pt-1">
                <Button onClick={save}><Check className="size-4" /> Save changes</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <dl className="divide-y divide-border">
              <Row label="Full name" value={user.fullName} />
              <Row label="Email" value={user.email ?? "—"} />
              <Row label="Phone" value={user.phone ?? "—"} />
              <Row label="Role" value={user.role === "admin" ? "Administrator" : "Reader"} />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
