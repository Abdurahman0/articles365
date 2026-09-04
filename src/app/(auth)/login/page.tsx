"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { authApi } from "@/services/auth.api";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!identifier.trim() || !password.trim()) {
      setErr("Please fill in all fields.");
      return;
    }
    setBusy(true);
    try {
      const user = await authApi.login(identifier, password);
      setUser(user);
      router.push("/books");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in to your library. New here?{" "}
        <Link href="/register" className="text-primary hover:underline">Create account</Link>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        {(["email", "phone"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
              mode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "email" ? <Mail className="size-3.5" /> : <Phone className="size-3.5" />}
            {m === "email" ? "Email" : "Phone"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="id">{mode === "email" ? "Email address" : "Phone number"}</Label>
          <Input
            id="id"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            inputMode={mode === "phone" ? "tel" : "email"}
            placeholder={mode === "email" ? "you@example.com" : "+998 90 123 45 67"}
            autoComplete="username"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">Forgot password?</Link>
          </div>
          <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" defaultChecked className="size-4 rounded border-input bg-transparent accent-[var(--color-primary)]" />
          Remember me for 30 days
        </label>

        {err && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
        </Button>
        <button
          type="button"
          onClick={() => { setMode("email"); setIdentifier("aziz@articles365.com"); setPassword("demo1234"); }}
          className="w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          Fill demo credentials · admin@ for admin
        </button>
      </form>
    </div>
  );
}
