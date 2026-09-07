// Admin authorization guard for the blog API.
//
// This project ships a mock, client-side auth (zustand `a365.auth`, role on the
// user object) with no server tokens. To stay consistent with that system, the
// client sends its role via `x-a365-role` and the guard checks it. This is
// demo-grade — swap for real session/JWT verification when a backend exists.

import "server-only";

export interface AdminContext {
  role: "admin";
  userId?: string;
}

export function getAdmin(req: Request): AdminContext | null {
  const role = req.headers.get("x-a365-role")?.toLowerCase();
  if (role !== "admin") return null;
  return { role: "admin", userId: req.headers.get("x-a365-user-id") ?? undefined };
}

export function forbidden(message = "Admin access required.") {
  return Response.json({ error: message }, { status: 403 });
}
