"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PdfImport } from "@/components/blog/pdf-import";
import { BlogEditor } from "@/components/blog/blog-editor";
import type { BlogDocument } from "@/types/blog";

export default function CreateBlogPage() {
  const [doc, setDoc] = useState<BlogDocument | null>(null);

  if (doc) return <BlogEditor initial={doc} initialStatus="draft" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Blog
      </Link>
      <div className="mt-6 max-w-xl">
        <p className="eyebrow text-primary">New article</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Create from a PDF</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a PDF and we&apos;ll parse its layout locally — no AI — into an editable, structured article.
        </p>
      </div>
      <div className="mt-8">
        <PdfImport onImported={(d) => setDoc(d)} />
      </div>
    </div>
  );
}
