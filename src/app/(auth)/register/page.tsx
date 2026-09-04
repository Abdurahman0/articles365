"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/services/auth.api";
import { useAuthStore } from "@/stores/auth";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ fullName: "", identifier: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pwOk = form.password.length >= 8;
  const match = form.password && form.password === form.confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.fullName || !form.identifier) return setErr("Please complete all fields.");
    if (!pwOk) return setErr("Password must be at least 8 characters.");
    if (!match) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      const user = await authApi.register(form.fullName);
      setUser(user);
      router.push("/dashboard");
    } catch {
      setErr("Registration failed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Already have one?{" "}
        <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={form.fullName} onChange={set("fullName")} placeholder="Jane Cooper" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="id">Phone or email</Label>
          <Input id="id" value={form.identifier} onChange={set("identifier")} placeholder="you@example.com or +998…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" autoComplete="new-password" />
          {form.password && (
            <p className={`flex items-center gap-1 text-xs ${pwOk ? "text-emerald-400" : "text-muted-foreground"}`}>
              <Check className="size-3" /> 8+ characters
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf">Confirm password</Label>
          <Input id="cf" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" autoComplete="new-password" />
          {form.confirm && !match && <p className="text-xs text-red-400">Passwords do not match</p>}
        </div>

        {err && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </div>
  );
}
