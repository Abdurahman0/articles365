// Same-origin proxy to the backend API.
// - injects the ngrok skip-warning header
// - forwards Authorization + request body (JSON, multipart, binary)
// - streams responses back verbatim (PDF/cover bytes included)
// This avoids browser CORS and keeps the backend base URL server-side.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  process.env.API_BASE ??
  "https://f984-2a05-45c2-51fe-4b00-2022-87e3-fa20-2fa1.ngrok-free.app/api/v1";

async function forward(req: Request, path: string[]) {
  const url = new URL(req.url);
  const target = `${API_BASE}/${path.join("/")}${url.search}`;

  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "1");
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("accept", req.headers.get("accept") ?? "application/json");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return new Response(
      JSON.stringify({ detail: "Backendga ulanib bo‘lmadi (proxy)." }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  const resHeaders = new Headers();
  const passthrough = [
    "content-type",
    "content-length",
    "content-disposition",
    "cache-control",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) resHeaders.set(h, v);
  }
  resHeaders.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };
const handler = async (req: Request, ctx: Ctx) => {
  const { path } = await ctx.params;
  return forward(req, path);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
