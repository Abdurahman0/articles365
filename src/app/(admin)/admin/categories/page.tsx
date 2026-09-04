"use client";

import { useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/data/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/types";

export default function AdminCategories() {
  const [items, setItems] = useState<(Category & { active: boolean })[]>(
    () => CATEGORIES.map((c) => ({ ...c, active: c.active ?? true }))
  );
  const [edit, setEdit] = useState<(Category & { active: boolean }) | "new" | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  function openEdit(c: (Category & { active: boolean }) | "new") {
    setEdit(c);
    setForm(c === "new" ? { name: "", description: "" } : { name: c.name, description: c.description ?? "" });
  }
  function save() {
    if (edit === "new") {
      setItems([...items, { id: `c-${Date.now()}`, name: form.name, slug: form.name.toLowerCase().replace(/\s+/g, "-"), description: form.description, bookCount: 0, active: true }]);
    } else if (edit) {
      setItems(items.map((c) => (c.id === edit.id ? { ...c, name: form.name, description: form.description } : c)));
    }
    setEdit(null);
  }

  return (
    <div>
      <PageHeader title="Categories" description="Organize the catalog by subject."
        action={<Button onClick={() => openEdit("new")}><Plus className="size-4" /> New category</Button>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Tags className="size-4" /></span>
              <Badge variant={c.active ? "success" : "outline"}>{c.active ? "Active" : "Hidden"}</Badge>
            </div>
            <h3 className="mt-3 font-semibold">{c.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{c.bookCount ?? 0} titles</p>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(c)}><Pencil className="size-3.5" /> Edit</Button>
              <Switch checked={c.active} onCheckedChange={(v) => setItems(items.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} />
              <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setDel(c.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit === "new" ? "New category" : "Edit category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Technology" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}
        title="Delete this category?" description="Books in this category will need to be reassigned."
        confirmLabel="Delete" onConfirm={() => { setItems(items.filter((c) => c.id !== del)); }} />
    </div>
  );
}
