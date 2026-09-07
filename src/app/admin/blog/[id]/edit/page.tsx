"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { blogsApi } from "@/services/blogs.api";
import { BlogEditor } from "@/components/blog/blog-editor";
import type { Blog } from "@/types/blog";

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    blogsApi.get(id).then((b) => alive && setBlog(b)).catch((e) => alive && setError((e as Error).message));
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-destructive">{error}</p>
          <Link href="/blog" className="mt-3 inline-block text-sm text-primary hover:underline">Back to blog</Link>
        </div>
      </div>
    );
  }
  if (!blog) {
    return <div className="grid min-h-dvh place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  return <BlogEditor initial={blog.content} blogId={blog.id} initialStatus={blog.status} />;
}
