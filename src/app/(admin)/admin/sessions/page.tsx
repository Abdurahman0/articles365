"use client";

import { useMemo, useState } from "react";
import { Laptop, Monitor, Smartphone } from "lucide-react";
import { ADMIN_SESSIONS } from "@/data/sessions";
import { getUserById } from "@/data/users";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { cn, timeAgo } from "@/lib/utils";
import type { DeviceKind, Session } from "@/types";

const ICON: Record<DeviceKind, typeof Monitor> = {
  windows: Monitor, mac: Laptop, linux: Monitor, iphone: Smartphone, android: Smartphone, web: Monitor,
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => [...ADMIN_SESSIONS]);
  const [device, setDevice] = useState<"all" | "desktop" | "mobile">("all");
  const [term, setTerm] = useState<string | null>(null);

  const rows = useMemo(() => sessions.filter((s) => {
    if (device === "desktop") return ["windows", "mac", "linux", "web"].includes(s.device);
    if (device === "mobile") return ["iphone", "android"].includes(s.device);
    return true;
  }), [sessions, device]);

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Inspect and terminate active sessions across all users."
        action={
          <div className="flex gap-1.5">
            {(["all", "desktop", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={cn("rounded-lg border px-3 py-2 text-xs font-medium capitalize", device === d ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{d}</button>
            ))}
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Device</th><th className="px-4 py-3 font-medium">Browser / OS</th><th className="px-4 py-3 font-medium">IP</th><th className="px-4 py-3 font-medium">Last active</th><th className="px-4 py-3 text-right font-medium">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => {
                const Icon = ICON[s.device];
                const user = getUserById(s.userId);
                return (
                  <tr key={s.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium">{user?.fullName ?? s.userId}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /> {s.deviceName}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{s.browser} · {s.os}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.ip}</td>
                    <td className="px-4 py-3 text-muted-foreground">{timeAgo(s.lastActive)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.current ? <Badge variant="success">Current</Badge> : <Button variant="ghost" size="sm" onClick={() => setTerm(s.id)}>Terminate</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog open={!!term} onOpenChange={(v) => !v && setTerm(null)}
        title="Terminate this session?" description="The device will be signed out immediately."
        confirmLabel="Terminate" onConfirm={() => setSessions(sessions.filter((s) => s.id !== term))} />
    </div>
  );
}
