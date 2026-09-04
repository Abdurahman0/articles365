"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { getBookById } from "@/data/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { BookForm } from "@/components/admin/book-form";
import { Badge } from "@/components/ui/badge";

export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const book = getBookById(id);

  return (
    <div>
      <Link href="/admin/books" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Books
      </Link>
      <PageHeader
        title={book ? `Edit — ${book.title}` : "Edit book"}
        description={book ? `${book.pageCount} pages · added ${new Date(book.createdAt).getFullYear()}` : undefined}
        action={book && <Badge variant={book.status === "active" ? "success" : "outline"}>{book.status}</Badge>}
      />
      <BookForm
        mode="edit"
        initial={book ? {
          title: book.title, author: book.author, description: book.description,
          categorySlug: book.category.slug, active: book.status === "active",
          coverName: "cover.jpg", fileName: "book.pdf",
        } : undefined}
      />
    </div>
  );
}
