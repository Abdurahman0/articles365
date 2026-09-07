"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, Eye, Loader2, Pencil, Plus, Save, Send, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { blogsApi } from "@/services/blogs.api";
import { BlogArticle } from "@/components/blog/blog-renderer";
import type { BlogBlock, BlogBlockType, BlogDocument, BlogStatus } from "@/types/blog";
import { cn } from "@/lib/utils";

const nid = () => `blk_${Math.random().toString(36).slice(2, 9)}`;

const NEW_BLOCK: Record<BlogBlockType, () => BlogBlock> = {
  heading: () => ({ id: nid(), type: "heading", level: 2, text: "New heading" }),
  paragraph: () => ({ id: nid(), type: "paragraph", text: "New paragraph." }),
  quote: () => ({ id: nid(), type: "quote", text: "A memorable quote." }),
  image: () => ({ id: nid(), type: "image", url: "", alt: "", caption: "" }),
  callout: () => ({ id: nid(), type: "callout", title: "NOTE", content: "" }),
  "bullet-list": () => ({ id: nid(), type: "bullet-list", items: ["First item"] }),
  "ordered-list": () => ({ id: nid(), type: "ordered-list", items: ["First item"] }),
  table: () => ({ id: nid(), type: "table", headers: ["Column"], rows: [["Cell"]] }),
  quiz: () => ({ id: nid(), type: "quiz", questions: [{ question: "Question?", options: [{ key: "A", text: "" }, { key: "B", text: "" }] }] }),
};

const ADDABLE: BlogBlockType[] = ["heading", "paragraph", "quote", "bullet-list", "ordered-list", "image", "callout", "table", "quiz"];
const TYPE_LABEL: Record<BlogBlockType, string> = {
  heading: "Heading", paragraph: "Paragraph", quote: "Quote", image: "Image",
  callout: "Callout", "bullet-list": "Bullet list", "ordered-list": "Numbered list",
  table: "Table", quiz: "Quiz",
};

const field = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50";

export function BlogEditor({
  initial, blogId, initialStatus = "draft",
}: { initial: BlogDocument; blogId?: string; initialStatus?: BlogStatus }) {
  const router = useRouter();
  const [doc, setDoc] = useState<BlogDocument>(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState<null | "draft" | "published">(null);
  const [error, setError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<BlogStatus>(initialStatus);
  const [id, setId] = useState<string | undefined>(blogId);

  const setMeta = (patch: Partial<BlogDocument>) => setDoc((d) => ({ ...d, ...patch }));
  const setBlocks = (blocks: BlogBlock[]) => setDoc((d) => ({ ...d, blocks }));

  const updateBlock = (bid: string, patch: Partial<BlogBlock>) =>
    setBlocks(doc.blocks.map((b) => (b.id === bid ? ({ ...b, ...patch } as BlogBlock) : b)));
  const removeBlock = (bid: string) => setBlocks(doc.blocks.filter((b) => b.id !== bid));
  const moveBlock = (bid: string, dir: -1 | 1) => {
    const i = doc.blocks.findIndex((b) => b.id === bid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.blocks.length) return;
    const next = doc.blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const addBlock = (type: BlogBlockType) => setBlocks([...doc.blocks, NEW_BLOCK[type]()]);

  const save = async (status: BlogStatus) => {
    setSaving(status); setError(null);
    try {
      const clean: BlogDocument = { ...doc, coverImage: doc.coverImage || undefined };
      const blog = id
        ? await blogsApi.update(id, { document: clean, status })
        : await blogsApi.create(clean, status);
      setId(blog.id); setSavedStatus(blog.status);
      if (status === "published") router.push(`/blog/${blog.slug}`);
      else router.replace(`/admin/blog/${blog.id}/edit`);
    } catch (e) {
      setError((e as Error).message || "Save failed.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* toolbar */}
      <header className="z-20 flex items-center gap-3 border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{doc.title || "Untitled article"}</p>
          <p className="text-xs text-muted-foreground">
            {doc.blocks.length} blocks · {savedStatus}
            {doc.metadata?.sourceFileName ? ` · from ${doc.metadata.sourceFileName}` : ""}
          </p>
        </div>
        {/* mobile view toggle */}
        <div className="flex rounded-xl border border-border p-0.5 lg:hidden">
          <button onClick={() => setTab("edit")} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", tab === "edit" && "bg-secondary")}><Pencil className="size-3.5" />Edit</button>
          <button onClick={() => setTab("preview")} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", tab === "preview" && "bg-secondary")}><Eye className="size-3.5" />Preview</button>
        </div>
        <Button variant="outline" size="sm" onClick={() => save("draft")} disabled={!!saving}>
          {saving === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
        </Button>
        <Button size="sm" onClick={() => save("published")} disabled={!!saving}>
          {saving === "published" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publish
        </Button>
      </header>

      {error && <div className="border-b border-destructive/30 bg-[color-mix(in_srgb,var(--danger-c)_10%,transparent)] px-4 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* editor pane */}
        <div className={cn("min-h-0 overflow-y-auto border-r border-border p-4 sm:p-6", tab === "preview" && "hidden lg:block")}>
          <div className="mx-auto max-w-2xl space-y-6">
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <Labeled label="Title"><input className={field} value={doc.title} onChange={(e) => setMeta({ title: e.target.value })} /></Labeled>
              <Labeled label="Subtitle"><input className={field} value={doc.subtitle ?? ""} onChange={(e) => setMeta({ subtitle: e.target.value })} placeholder="Optional standfirst" /></Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Author"><input className={field} value={doc.author ?? ""} onChange={(e) => setMeta({ author: e.target.value })} placeholder="Optional" /></Labeled>
                <Labeled label="Cover image URL"><input className={field} value={doc.coverImage ?? ""} onChange={(e) => setMeta({ coverImage: e.target.value })} placeholder="/blog-media/…" /></Labeled>
              </div>
            </section>

            <div className="space-y-3">
              {doc.blocks.map((b, i) => (
                <BlockCard
                  key={b.id} block={b} index={i} total={doc.blocks.length}
                  onChange={(patch) => updateBlock(b.id, patch)}
                  onMove={(dir) => moveBlock(b.id, dir)}
                  onRemove={() => removeBlock(b.id)}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-3">
              <span className="mr-1 self-center text-xs font-medium text-muted-foreground">Add block:</span>
              {ADDABLE.map((t) => (
                <button key={t} onClick={() => addBlock(t)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:border-primary/40">
                  <Plus className="size-3.5" />{TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* live preview pane */}
        <div className={cn("min-h-0 overflow-y-auto bg-background", tab === "edit" && "hidden lg:block")}>
          <BlogArticle document={doc} />
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function BlockCard({
  block, index, total, onChange, onMove, onRemove,
}: {
  block: BlogBlock; index: number; total: number;
  onChange: (patch: Partial<BlogBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const area = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50 resize-y";
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[block.type]}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" /></IconBtn>
          <IconBtn label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="size-4" /></IconBtn>
          <IconBtn label="Delete" onClick={onRemove}><Trash2 className="size-4 text-destructive" /></IconBtn>
        </div>
      </div>

      {block.type === "heading" && (
        <div className="flex gap-2">
          <select className="rounded-xl border border-border bg-card px-2 text-sm" value={block.level}
            onChange={(e) => onChange({ level: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
          </select>
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50"
            value={block.text} onChange={(e) => onChange({ text: e.target.value })} />
        </div>
      )}

      {(block.type === "paragraph" || block.type === "quote") && (
        <textarea className={area} rows={block.type === "quote" ? 2 : 4} value={block.text} onChange={(e) => onChange({ text: e.target.value })} />
      )}

      {block.type === "callout" && (
        <div className="space-y-2">
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" placeholder="Title (optional)"
            value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea className={area} rows={3} value={block.content} onChange={(e) => onChange({ content: e.target.value })} />
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-2">
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" placeholder="Image URL"
            value={block.url} onChange={(e) => onChange({ url: e.target.value })} />
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" placeholder="Caption (optional)"
            value={block.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} />
          {block.url && <img src={block.url} alt="" className="max-h-40 rounded-lg border border-border object-contain" />}
        </div>
      )}

      {(block.type === "bullet-list" || block.type === "ordered-list") && (
        <textarea className={area} rows={Math.min(8, block.items.length + 1)} value={block.items.join("\n")}
          onChange={(e) => onChange({ items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          placeholder="One item per line" />
      )}

      {block.type === "table" && (
        <div className="space-y-2">
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" placeholder="Headers, comma-separated"
            value={block.headers.join(", ")} onChange={(e) => onChange({ headers: e.target.value.split(",").map((s) => s.trim()) })} />
          <textarea className={area} rows={4} placeholder="One row per line, cells separated by |"
            value={block.rows.map((r) => r.join(" | ")).join("\n")}
            onChange={(e) => onChange({ rows: e.target.value.split("\n").filter(Boolean).map((r) => r.split("|").map((c) => c.trim())) })} />
        </div>
      )}

      {block.type === "quiz" && (
        <p className="text-xs text-muted-foreground">
          {block.questions.length} question(s). Edit quiz questions in JSON via the source PDF re-import, or delete/keep as extracted.
        </p>
      )}
    </div>
  );
}

function IconBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-30">
      {children}
    </button>
  );
}
