import Link from "next/link";
import { BookOpen, Highlighter, Library, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKS, CATEGORIES } from "@/data/catalog";

const VALUES = [
  { icon: ShieldCheck, title: "Protection first", body: "Content opens only inside our reader. No files leave the platform." },
  { icon: Sparkles, title: "Editorial quality", body: "Every title is curated and presented with obsessive attention to craft." },
  { icon: Library, title: "Truly yours", body: "Your library, progress, notes and highlights — synced and permanent." },
];

const STATS = [
  { value: `${BOOKS.length}+`, label: "Titles" },
  { value: `${CATEGORIES.length}`, label: "Categories" },
  { value: "100%", label: "Protected reading" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="brand-backdrop relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <p className="eyebrow text-primary">About</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            A premium home for the ideas worth protecting.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Articles365 by 365 Magazines is a protected digital reading platform. We pair a
            beautiful, focused reader with strong content protection — so publishers can share
            premium work and readers can truly own their library.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-3xl font-semibold text-primary sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><v.icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">How reading stays protected</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              { icon: Lock, t: "No downloads", d: "The original file is never exposed — no URL, no export." },
              { icon: BookOpen, t: "Server-gated content", d: "Every page is delivered only to an authorized session." },
              { icon: Highlighter, t: "Dynamic watermark", d: "A subtle per-user mark stays visible while you read." },
              { icon: ShieldCheck, t: "Session control", d: "See and revoke every device connected to your account." },
            ].map((f) => (
              <div key={f.t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><f.icon className="size-4" /></span>
                <div><p className="text-sm font-semibold">{f.t}</p><p className="text-sm text-muted-foreground">{f.d}</p></div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Note: web technology cannot fully prevent screenshots or external cameras. Our protection
            raises the effort bar and keeps the source traceable.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="brand-backdrop rounded-3xl border border-border px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Start reading with Articles365</h2>
          <Button asChild size="lg" className="mt-6"><Link href="/register">Create your account</Link></Button>
        </div>
      </section>
    </div>
  );
}
