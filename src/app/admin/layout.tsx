"use client";

import { ShieldCheck } from "lucide-react";
import { useAuthStore, isAdmin } from "@/stores/auth";
import { ADMIN_USER } from "@/data/users";
import { Button } from "@/components/ui/button";

// Client-side admin gate on top of the project's existing mock auth
// (zustand `a365.auth`). The demo sign-in mirrors authApi (identifier starting
// with "admin" → admin) so the feature is usable without a real backend.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hydrated, setUser } = useAuthStore();

  if (!hydrated) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin(user)) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--chip)] text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">Admin access required</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in as an admin to create and publish articles.
          </p>
          <Button className="mt-6 w-full" onClick={() => setUser(ADMIN_USER)}>
            Continue as admin (demo)
          </Button>
        </div>
      </div>
    );
  }

  return <div className="min-h-dvh bg-background">{children}</div>;
}
