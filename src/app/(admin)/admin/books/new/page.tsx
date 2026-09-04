"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BookForm } from "@/components/admin/book-form";

export default function NewBookPage() {
  return (
    <div>
      <Link href="/admin/books" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Books
      </Link>
      <PageHeader title="New book" description="Add a title to the catalog." />
      <BookForm mode="create" />
    </div>
  );
}
