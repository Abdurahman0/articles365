"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Loader2, Lock, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "@/data/catalog";
import { delay } from "@/lib/utils";

interface Values {
  title: string; author: string; description: string; categorySlug: string; active: boolean;
  coverName?: string; fileName?: string;
}

export function BookForm({ initial, mode }: { initial?: Partial<Values>; mode: "create" | "edit" }) {
  const router = useRouter();
  const [v, setV] = useState<Values>({
    title: initial?.title ?? "", author: initial?.author ?? "", description: initial?.description ?? "",
    categorySlug: initial?.categorySlug ?? CATEGORIES[0].slug, active: initial?.active ?? true,
    coverName: initial?.coverName, fileName: initial?.fileName,
  });
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

  async function submit() {
    setBusy(true);
    await delay(800);
    setBusy(false);
    router.push("/admin/books");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Book title</Label><Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="The Art of Exploitation" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Author</Label><Input value={v.author} onChange={(e) => set("author", e.target.value)} placeholder="Author name" /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select value={v.categorySlug} onChange={(e) => set("categorySlug", e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary/50">
                  {CATEGORIES.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={5} placeholder="A short editorial description…" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Files</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Upload
              icon={ImageIcon} label="Cover image" hint="PNG or JPG, 3:4"
              name={v.coverName} inputRef={coverRef}
              onPick={(f) => set("coverName", f)}
            />
            <Upload
              icon={FileText} label="Book file (PDF)" hint="Stored privately — never exposed"
              name={v.fileName} inputRef={fileRef} secure
              onPick={(f) => set("fileName", f)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Publish</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Active</p><p className="text-xs text-muted-foreground">Visible in the catalog.</p></div>
              <Switch checked={v.active} onCheckedChange={(c) => set("active", c)} />
            </div>
            <Button className="w-full" onClick={submit} disabled={busy || !v.title}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : mode === "create" ? "Create book" : "Save changes"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.back()}>Cancel</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex gap-3 pt-6 text-xs text-muted-foreground">
            <Lock className="size-4 shrink-0 text-primary" />
            Uploaded book files are stored privately and delivered only through the protected reader — never as a public URL.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Upload({
  icon: Icon, label, hint, name, inputRef, onPick, secure,
}: {
  icon: typeof FileText; label: string; hint: string; name?: string;
  inputRef: React.RefObject<HTMLInputElement | null>; onPick: (name: string) => void; secure?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center transition-colors hover:border-primary/40">
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
          {name ? <Icon className="size-5" /> : <UploadCloud className="size-5" />}
        </span>
        <span className="text-sm font-medium">{name ?? "Click to upload"}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">{secure && <Lock className="size-3" />}{hint}</span>
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f.name); }} />
    </div>
  );
}
