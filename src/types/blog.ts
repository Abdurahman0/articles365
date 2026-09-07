// Blog domain types for the PDF-to-Blog feature.
// The structured article schema is intentionally extensible: add a new block
// variant to `BlogBlock` and handle it in the renderer + editor.

export type BlogStatus = "draft" | "published";

export interface QuizOption {
  key: string; // "A" | "B" | ...
  text: string;
}
export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  answer?: string; // only set if the PDF explicitly stated one
}

export type BlogBlock =
  | { id: string; type: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string }
  | { id: string; type: "callout"; title?: string; content: string }
  | { id: string; type: "bullet-list"; items: string[] }
  | { id: string; type: "ordered-list"; items: string[] }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "table"; headers: string[]; rows: string[][] }
  | { id: string; type: "quiz"; questions: QuizQuestion[] };

export type BlogBlockType = BlogBlock["type"];

export interface BlogDocument {
  title: string;
  subtitle?: string;
  author?: string;
  coverImage?: string;
  metadata?: {
    sourceFileName?: string;
    pageCount?: number;
  };
  blocks: BlogBlock[];
}

// Stored entity (filesystem JSON store). `content` holds the BlogDocument.
export interface Blog {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  coverImage?: string;
  content: BlogDocument;
  sourcePdf?: string;
  status: BlogStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

// Lightweight list item (no full block content) for index pages.
export interface BlogSummary {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author?: string;
  coverImage?: string;
  status: BlogStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

// ---- Intermediate PDF representation (parser internal, exported for tests) --
export interface PdfTextItem {
  page: number;
  text: string;
  x: number; // left, top-down coordinate space (px at scale 1)
  y: number; // top of the glyph box
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
}
