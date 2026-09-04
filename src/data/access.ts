import type { AccessGrant } from "@/types";
import { BOOKS } from "./catalog";
import { ADMIN_USERS } from "./users";

const b = (i: number) => BOOKS[i];

export const ACCESS_GRANTS: AccessGrant[] = [
  { id: "ag1", userId: "u-100", userName: "Aziz Karimov", bookId: b(0).id, bookTitle: b(0).title, grantedBy: "Studio Admin", grantedAt: "2026-08-20T10:00:00.000Z", status: "active" },
  { id: "ag2", userId: "u-100", userName: "Aziz Karimov", bookId: b(5).id, bookTitle: b(5).title, grantedBy: "Studio Admin", grantedAt: "2026-08-22T10:00:00.000Z", status: "active" },
  { id: "ag3", userId: "u-101", userName: "Dilnoza Rashidova", bookId: b(2).id, bookTitle: b(2).title, grantedBy: "Studio Admin", grantedAt: "2026-08-25T10:00:00.000Z", status: "active" },
  { id: "ag4", userId: "u-103", userName: "Malika Yusupova", bookId: b(1).id, bookTitle: b(1).title, grantedBy: "Studio Admin", grantedAt: "2026-08-28T10:00:00.000Z", status: "active" },
  { id: "ag5", userId: "u-104", userName: "Jasur Alimov", bookId: b(4).id, bookTitle: b(4).title, grantedBy: "Studio Admin", grantedAt: "2026-09-01T10:00:00.000Z", status: "active" },
  { id: "ag6", userId: "u-105", userName: "Kamila Nurova", bookId: b(6).id, bookTitle: b(6).title, grantedBy: "Studio Admin", grantedAt: "2026-09-02T10:00:00.000Z", status: "revoked" },
];

export const METRICS = {
  totalUsers: ADMIN_USERS.length,
  activeUsers: ADMIN_USERS.filter((u) => u.status === "active").length,
  totalBooks: BOOKS.length,
  activeBooks: BOOKS.filter((b) => b.status === "active").length,
  accessGrants: ACCESS_GRANTS.filter((g) => g.status === "active").length,
  activeSessions: 6,
};
