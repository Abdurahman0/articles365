"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { parsePdfInBrowser } from "@/lib/pdf-client";
import { BlogArticle } from "@/components/blog/blog-renderer";
import type { BlogBlock, BlogDocument } from "@/types/blog";

// spread the extracted images (minus the cover) through the article body so it
// reads like a magazine feature rather than text then a pile of photos.
function distributeImages(doc: BlogDocument, images: string[]): BlogDocument {
  const inline = images.filter((u) => u !== doc.coverImage);
  if (!inline.length) return doc;
  const blocks = doc.blocks.slice();
  const mk = (url: string, n: number): BlogBlock => ({ id: `iimg_${n}`, type: "image", url });
  const paraIdx = blocks.map((b, i) => (b.type === "paragraph" ? i : -1)).filter((i) => i >= 0);
  if (!paraIdx.length) { inline.forEach((u, n) => blocks.push(mk(u, n))); return { ...doc, blocks }; }
  const step = Math.max(1, Math.floor(paraIdx.length / (inline.length + 1)));
  inline
    .map((u, n) => ({ at: paraIdx[Math.min(paraIdx.length - 1, step * (n + 1))], block: mk(u, n) }))
    .sort((a, b) => b.at - a.at)
    .forEach(({ at, block }) => blocks.splice(at + 1, 0, block));
  return { ...doc, blocks };
}

export function IssueArticle({ pdfUrl, title }: { pdfUrl: string; title: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [stage, setStage] = useState("Opening the issue…");
  const [doc, setDoc] = useState<BlogDocument | null>(null);

  useEffect(() => {
    let alive = true;
    const cacheKey = `a365.issue.${pdfUrl}`;
    (async () => {
      try {
        // instant on repeat visits within the session
        try { const c = sessionStorage.getItem(cacheKey); if (c) { setDoc(JSON.parse(c)); setPhase("ready"); return; } } catch { /* ignore */ }

        const blob = await (await fetch(pdfUrl)).blob();
        if (!alive) return;
        const file = new File([blob], pdfUrl.split("/").pop() || "issue.pdf", { type: "application/pdf" });
        const { document, images } = await parsePdfInBrowser(file, (s) => { if (alive) setStage(s); });
        if (!alive) return;
        const withImages = distributeImages(document, images);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(withImages)); } catch { /* too big to cache — fine */ }
        setDoc(withImages);
        setPhase("ready");
      } catch { if (alive) setPhase("error"); }
    })();
    return () => { alive = false; };
  }, [pdfUrl]);

  if (phase === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{stage}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rendered from the PDF in your browser — no AI, no upload.</p>
        </div>
      </div>
    );
  }

  if (phase === "error" || !doc) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4 text-center">
        <div>
          <p className="text-sm text-foreground">Couldn&apos;t open this issue.</p>
          <Link href="/books" className="mt-3 inline-block text-sm text-primary hover:underline">Back to books</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Books
        </Link>
      </div>
      <BlogArticle document={doc} />
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <Link href="/books" className="text-primary hover:underline">← Back to books</Link>
      </footer>
    </div>
  );
}
