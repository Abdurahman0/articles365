// Domain types shared across features. Mock now, backend-shaped for later.

export type Role = "user" | "admin";
export type AccountStatus = "active" | "blocked";
export type ReadingStatus = "new" | "reading" | "completed";
export type BookStatus = "active" | "inactive";
export type HighlightColor = "yellow" | "orange" | "green" | "blue" | "pink";
export type ReaderTheme = "light" | "dark" | "sepia";
export type PageFit = "width" | "page";
export type DeviceKind = "windows" | "mac" | "iphone" | "android" | "linux" | "web";

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  bookCount?: number;
  active?: boolean;
}

export interface TocItem {
  id: string;
  title: string;
  page: number;
  children?: TocItem[];
}

export interface BookPage {
  page: number;
  chapterId: string;
  heading?: string;
  paragraphs: string[];
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: Category;
  description: string;
  coverColor: [string, string]; // gradient stops for generated cover
  pageCount: number;
  status: BookStatus;
  year: number;
  featured?: boolean;
  /** Static PDF path (public/) for real flip-book reading — no API. */
  pdf?: string;
  createdAt: string;
}

export interface OwnedBook extends Book {
  readingStatus: ReadingStatus;
  progress: number; // 0..100
  lastPage: number;
  lastReadAt?: string;
  bookmarksCount: number;
  notesCount: number;
  highlightsCount: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  bookTitle: string;
  page: number;
  color: HighlightColor;
  text: string;
  note?: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  page: number;
  label?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  bookTitle: string;
  page: number;
  title?: string;
  content: string;
  quote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  device: DeviceKind;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface AccessGrant {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  grantedBy: string;
  grantedAt: string;
  status: "active" | "revoked";
}
