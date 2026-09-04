import type { User } from "@/types";

export const CURRENT_USER: User = {
  id: "u-100",
  fullName: "Aziz Karimov",
  email: "aziz@articles365.com",
  phone: "+998 90 123 45 12",
  role: "user",
  status: "active",
  createdAt: "2025-02-14T09:00:00.000Z",
};

export const ADMIN_USER: User = {
  id: "u-001",
  fullName: "Studio Admin",
  email: "admin@articles365.com",
  phone: "+998 90 000 00 01",
  role: "admin",
  status: "active",
  createdAt: "2024-11-01T09:00:00.000Z",
};

export const ADMIN_USERS: User[] = [
  ADMIN_USER,
  CURRENT_USER,
  { id: "u-101", fullName: "Dilnoza Rashidova", email: "dilnoza@mail.com", phone: "+998 93 771 20 08", role: "user", status: "active", createdAt: "2025-03-02T09:00:00.000Z" },
  { id: "u-102", fullName: "Sardor Bekov", email: null, phone: "+998 94 555 88 21", role: "user", status: "blocked", createdAt: "2025-01-19T09:00:00.000Z" },
  { id: "u-103", fullName: "Malika Yusupova", email: "malika.y@mail.com", phone: "+998 91 200 14 77", role: "user", status: "active", createdAt: "2025-04-11T09:00:00.000Z" },
  { id: "u-104", fullName: "Jasur Alimov", email: "jasur@studio.io", phone: null, role: "user", status: "active", createdAt: "2025-05-08T09:00:00.000Z" },
  { id: "u-105", fullName: "Kamila Nurova", email: "kamila@mail.com", phone: "+998 97 401 33 90", role: "user", status: "active", createdAt: "2025-05-22T09:00:00.000Z" },
  { id: "u-106", fullName: "Timur Saidov", email: "timur.s@mail.com", phone: "+998 90 118 62 45", role: "user", status: "blocked", createdAt: "2025-06-30T09:00:00.000Z" },
];

export const getUserById = (id: string) =>
  ADMIN_USERS.find((u) => u.id === id);
