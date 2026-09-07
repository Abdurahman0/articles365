// Real client -> Next route-handler API for the blog feature (the other
// services in this folder are mocks; this one talks to /api/blogs).

import type { Blog, BlogDocument, BlogStatus, BlogSummary } from "@/types/blog";

// Read the persisted mock-auth user (zustand `a365.auth`) so admin requests
// carry the role the server guard expects. Demo-grade — see src/server/auth.ts.
function adminHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("a365.auth");
    if (raw) {
      const user = JSON.parse(raw)?.state?.user;
      if (user?.role === "admin") return { "x-a365-role": "admin", "x-a365-user-id": String(user.id ?? "") };
    }
  } catch { /* ignore */ }
  return {};
}

async function readError(res: Response): Promise<string> {
  try { const j = await res.json(); return j.error || j.detail || res.statusText; }
  catch { return res.statusText || `Request failed (${res.status})`; }
}

export interface ImportProgress {
  stage: "uploading" | "processing";
  percent: number; // 0..100 (upload only; processing is indeterminate)
}

export const blogsApi = {
  /** Upload + convert a PDF. Uses XHR to report upload progress. */
  importPdf(file: File, onProgress?: (p: ImportProgress) => void): Promise<BlogDocument> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/blogs/import-pdf");
      const headers = adminHeaders();
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.({ stage: "uploading", percent: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.upload.onload = () => onProgress?.({ stage: "processing", percent: 100 });
      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onload = () => {
        let body: { document?: BlogDocument; error?: string; detail?: string } = {};
        try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300 && body.document) resolve(body.document);
        else reject(new Error(body.error || body.detail || `Import failed (${xhr.status}).`));
      };
      xhr.send(form);
    });
  },

  async create(document: BlogDocument, status: BlogStatus = "draft", sourcePdf?: string): Promise<Blog> {
    const res = await fetch("/api/blogs", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ document, status, sourcePdf }),
    });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()).blog;
  },

  async update(id: string, patch: { document?: BlogDocument; status?: BlogStatus; slug?: string }): Promise<Blog> {
    const res = await fetch(`/api/blogs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()).blog;
  },

  async get(idOrSlug: string): Promise<Blog> {
    const res = await fetch(`/api/blogs/${idOrSlug}`, { headers: { ...adminHeaders() } });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()).blog;
  },

  async list(status?: BlogStatus): Promise<BlogSummary[]> {
    const q = status ? `?status=${status}` : "";
    const res = await fetch(`/api/blogs${q}`, { headers: { ...adminHeaders() } });
    if (!res.ok) throw new Error(await readError(res));
    return (await res.json()).blogs;
  },
};
