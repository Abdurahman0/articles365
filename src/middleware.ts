import { NextResponse, type NextRequest } from "next/server";

// CORS for the blog API (/api/blogs*). Cross-origin callers must be on the
// allowlist; same-origin requests carry no Origin header and are untouched.
// Override the allowlist with BLOG_CORS_ORIGINS (comma-separated, or "*").
const ALLOWED = (
  process.env.BLOG_CORS_ORIGINS ??
  "https://articles365-umber.vercel.app,http://localhost:3210,http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function resolveOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED.includes("*")) return "*";
  return ALLOWED.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  const allow = resolveOrigin(origin);
  if (allow) {
    headers.set("Access-Control-Allow-Origin", allow);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type,x-a365-role,x-a365-user-id");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

export function middleware(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  // preflight — answer before the route runs
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  const res = NextResponse.next();
  headers.forEach((v, k) => res.headers.set(k, v));
  return res;
}

export const config = { matcher: ["/api/blogs", "/api/blogs/:path*"] };
