import type { Session } from "@/types";

export const SESSIONS: Session[] = [
  { id: "s1", userId: "u-100", device: "windows", deviceName: "Windows PC", browser: "Chrome 128", os: "Windows 11", location: "Tashkent, UZ", ip: "84.54.xx.xx", lastActive: "2026-09-04T09:10:00.000Z", current: true },
  { id: "s2", userId: "u-100", device: "iphone", deviceName: "iPhone 15", browser: "Safari", os: "iOS 18", location: "Tashkent, UZ", ip: "84.54.xx.xx", lastActive: "2026-09-04T07:40:00.000Z", current: false },
  { id: "s3", userId: "u-100", device: "mac", deviceName: 'MacBook Pro 14"', browser: "Safari 18", os: "macOS Sequoia", location: "Samarkand, UZ", ip: "213.230.xx.xx", lastActive: "2026-09-02T21:05:00.000Z", current: false },
];

// Admin view — sessions across users.
export const ADMIN_SESSIONS: Session[] = [
  ...SESSIONS,
  { id: "s4", userId: "u-101", device: "android", deviceName: "Pixel 8", browser: "Chrome 128", os: "Android 15", location: "Tashkent, UZ", ip: "84.54.xx.xx", lastActive: "2026-09-04T08:55:00.000Z", current: false },
  { id: "s5", userId: "u-103", device: "windows", deviceName: "Windows PC", browser: "Edge 128", os: "Windows 10", location: "Bukhara, UZ", ip: "195.158.xx.xx", lastActive: "2026-09-03T14:20:00.000Z", current: false },
  { id: "s6", userId: "u-104", device: "mac", deviceName: "iMac", browser: "Safari 18", os: "macOS", location: "Tashkent, UZ", ip: "213.230.xx.xx", lastActive: "2026-09-04T06:15:00.000Z", current: false },
];
