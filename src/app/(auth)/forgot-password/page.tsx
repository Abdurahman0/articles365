"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/forms/otp-input";
import { delay } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    await delay(700);
    setBusy(false);
    setStep("verify");
  }

  if (step === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <MailCheck className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Password reset</h1>
        <p className="mt-2 text-sm text-muted-foreground">You can now sign in with your new password.</p>
        <Button asChild className="mt-6 w-full"><Link href="/login">Back to sign in</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      {step === "request" ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email or phone and we'll send a verification code.
          </p>
          <form onSubmit={request} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="id">Email or phone</Label>
              <Input id="id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Send code"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Enter code</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground">{identifier}</span>.
          </p>
          <div className="mt-6">
            <OtpInput onComplete={() => setStep("done")} />
            <p className="mt-4 text-xs text-muted-foreground">
              Didn't get it? <button className="text-primary hover:underline" onClick={() => setStep("request")}>Resend</button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
