import type { Bookmark, Highlight, Note } from "@/types";
import { getBookBySlug } from "./catalog";

const t = (slug: string) => getBookBySlug(slug)?.title ?? "";
const id = (slug: string) => getBookBySlug(slug)?.id ?? "";

export const HIGHLIGHTS: Highlight[] = [
  { id: "h1", bookId: id("the-art-of-exploitation"), bookTitle: t("the-art-of-exploitation"), page: 4, color: "yellow", text: "A good model is not one that explains everything, but one that fails in instructive ways.", createdAt: "2026-09-03T18:22:00.000Z" },
  { id: "h2", bookId: id("the-art-of-exploitation"), bookTitle: t("the-art-of-exploitation"), page: 8, color: "green", text: "Every system optimises for something, and the interesting question is always what it quietly ignores.", note: "Threat modelling lens.", createdAt: "2026-09-03T18:40:00.000Z" },
  { id: "h3", bookId: id("the-founders-map"), bookTitle: t("the-founders-map"), page: 11, color: "orange", text: "We overestimate what changes in a year and badly underestimate what compounds across a decade.", createdAt: "2026-09-04T08:11:00.000Z" },
  { id: "h4", bookId: id("the-founders-map"), bookTitle: t("the-founders-map"), page: 17, color: "blue", text: "The best decisions look obvious in hindsight and reckless in the moment they are made.", createdAt: "2026-09-04T08:30:00.000Z" },
  { id: "h5", bookId: id("the-quiet-compounding"), bookTitle: t("the-quiet-compounding"), page: 6, color: "pink", text: "The discipline is not in having the idea, but in refusing to abandon it when the returns go flat.", createdAt: "2026-08-28T20:05:00.000Z" },
  { id: "h6", bookId: id("deep-work-systems"), bookTitle: t("deep-work-systems"), page: 3, color: "yellow", text: "Attention is the one resource you cannot borrow.", createdAt: "2026-09-01T12:14:00.000Z" },
];

export const BOOKMARKS: Bookmark[] = [
  { id: "b1", bookId: id("the-art-of-exploitation"), bookTitle: t("the-art-of-exploitation"), page: 12, label: "Return here — stack layout", createdAt: "2026-09-03T18:25:00.000Z" },
  { id: "b2", bookId: id("the-art-of-exploitation"), bookTitle: t("the-art-of-exploitation"), page: 5, createdAt: "2026-09-02T10:00:00.000Z" },
  { id: "b3", bookId: id("the-founders-map"), bookTitle: t("the-founders-map"), page: 19, label: "Pricing chapter", createdAt: "2026-09-04T08:32:00.000Z" },
  { id: "b4", bookId: id("the-quiet-compounding"), bookTitle: t("the-quiet-compounding"), page: 22, createdAt: "2026-08-28T21:00:00.000Z" },
  { id: "b5", bookId: id("deep-work-systems"), bookTitle: t("deep-work-systems"), page: 6, createdAt: "2026-09-01T12:20:00.000Z" },
];

export const NOTES: Note[] = [
  { id: "n1", bookId: id("the-art-of-exploitation"), bookTitle: t("the-art-of-exploitation"), page: 8, title: "Threat modelling", content: "Map what the system quietly ignores — that's the attack surface. Revisit with the STRIDE checklist.", quote: "Every system optimises for something…", createdAt: "2026-09-03T18:41:00.000Z", updatedAt: "2026-09-03T18:41:00.000Z" },
  { id: "n2", bookId: id("the-founders-map"), bookTitle: t("the-founders-map"), page: 11, content: "Decade-scale thinking changes hiring and pricing. Draft a 10-year memo.", quote: "We overestimate what changes in a year…", createdAt: "2026-09-04T08:12:00.000Z", updatedAt: "2026-09-04T08:12:00.000Z" },
  { id: "n3", bookId: id("the-founders-map"), bookTitle: t("the-founders-map"), page: 19, title: "Pricing", content: "Value-based pricing beats cost-plus for premium products. Test a 3-tier ladder.", createdAt: "2026-09-04T08:33:00.000Z", updatedAt: "2026-09-04T08:33:00.000Z" },
  { id: "n4", bookId: id("the-quiet-compounding"), bookTitle: t("the-quiet-compounding"), page: 6, content: "Position sizing > prediction. Never risk more than the thesis can survive.", createdAt: "2026-08-28T20:06:00.000Z", updatedAt: "2026-08-28T20:06:00.000Z" },
];
