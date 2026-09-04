"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonitorSmartphone } from "lucide-react";
import { authApi } from "@/services/auth.api";
import { PageHeader } from "@/components/layout/page-header";
import { SessionCard } from "@/components/sessions/session-card";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Session } from "@/types";

export default function SessionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: authApi.sessions });
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "one" | "all"; id?: string } | null>(null);

  const list = sessions ?? data ?? [];

  function revoke(id: string) {
    setSessions(list.filter((s) => s.id !== id));
  }
  function revokeOthers() {
    setSessions(list.filter((s) => s.current));
  }

  return (
    <div>
      <PageHeader
        title="Devices & Sessions"
        description="See where you're signed in and end any session you don't recognize."
        action={
          list.filter((s) => !s.current).length > 0 ? (
            <Button variant="outline" onClick={() => setConfirm({ kind: "all" })}>Sign out others</Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={MonitorSmartphone} title="No active sessions" description="You're not signed in on any device." />
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <SessionCard key={s.id} session={s} onRevoke={(id) => setConfirm({ kind: "one", id })} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.kind === "all" ? "Sign out all other sessions?" : "End this session?"}
        description={confirm?.kind === "all"
          ? "All devices except this one will be signed out immediately."
          : "This device will be signed out immediately and will need to sign in again."}
        confirmLabel={confirm?.kind === "all" ? "Sign out others" : "Sign out"}
        onConfirm={() => { if (confirm?.kind === "all") revokeOthers(); else if (confirm?.id) revoke(confirm.id); }}
      />
    </div>
  );
}
