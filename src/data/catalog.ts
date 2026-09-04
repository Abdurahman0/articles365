import type { Book, Category } from "@/types";

export const CATEGORIES: Category[] = [
  { id: "c-business", name: "Business", slug: "business", description: "Strategy, leadership and modern enterprise.", active: true },
  { id: "c-tech", name: "Technology", slug: "technology", description: "Engineering, security and the systems that run the world.", active: true },
  { id: "c-design", name: "Design", slug: "design", description: "Craft, typography and product thinking.", active: true },
  { id: "c-mindset", name: "Mindset", slug: "mindset", description: "Focus, habits and the inner game.", active: true },
  { id: "c-finance", name: "Finance", slug: "finance", description: "Markets, capital and personal wealth.", active: true },
  { id: "c-science", name: "Science", slug: "science", description: "Ideas that reshape how we see reality.", active: true },
];

const cat = (slug: string) => CATEGORIES.find((c) => c.slug === slug)!;

interface Seed {
  slug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  cover: [string, string];
  pageCount: number;
  year: number;
  featured?: boolean;
  status?: "active" | "inactive";
}

const SEEDS: Seed[] = [
  {
    slug: "the-art-of-exploitation",
    title: "The Art of Exploitation",
    author: "Jon Erickson",
    category: "technology",
    description:
      "A rigorous, first-principles tour of how software actually breaks — and the mindset required to defend it.",
    cover: ["#1b2a4a", "#0a1122"],
    pageCount: 488,
    year: 2019,
    featured: true,
  },
  {
    slug: "signals-and-noise",
    title: "Signals & Noise",
    author: "Maya Renard",
    category: "science",
    description:
      "Why most predictions fail, and how disciplined thinkers separate the meaningful from the merely loud.",
    cover: ["#2a1b3d", "#120a1c"],
    pageCount: 356,
    year: 2021,
    featured: true,
  },
  {
    slug: "the-quiet-compounding",
    title: "The Quiet Compounding",
    author: "Idris Bello",
    category: "finance",
    description:
      "A calm, contrarian guide to building wealth through patience, position sizing and time.",
    cover: ["#123028", "#07130f"],
    pageCount: 298,
    year: 2022,
    featured: true,
  },
  {
    slug: "type-and-tension",
    title: "Type & Tension",
    author: "Clara Fontaine",
    category: "design",
    description:
      "An editorial masterclass on typography, rhythm and the invisible craft of reading.",
    cover: ["#3a1f16", "#170a06"],
    pageCount: 244,
    year: 2020,
  },
  {
    slug: "deep-work-systems",
    title: "Deep Work Systems",
    author: "Nadia Kovač",
    category: "mindset",
    description:
      "Designing an environment where focus is the default and distraction is expensive.",
    cover: ["#122a3a", "#07141c"],
    pageCount: 312,
    year: 2023,
  },
  {
    slug: "the-founders-map",
    title: "The Founder's Map",
    author: "Samuel Ortiz",
    category: "business",
    description:
      "From zero to durable company — the decisions that compound and the ones that quietly kill.",
    cover: ["#3a2f12", "#1c1607"],
    pageCount: 402,
    year: 2021,
    featured: true,
  },
  {
    slug: "protocols-of-trust",
    title: "Protocols of Trust",
    author: "Wei Zhang",
    category: "technology",
    description:
      "Cryptography, identity and the architecture of systems that strangers can rely on.",
    cover: ["#0f2a2a", "#061414"],
    pageCount: 366,
    year: 2022,
  },
  {
    slug: "the-margin-of-craft",
    title: "The Margin of Craft",
    author: "Elena Marsh",
    category: "design",
    description:
      "Small decisions, obsessive polish, and why the last 10% defines premium products.",
    cover: ["#2a1424", "#130a11"],
    pageCount: 276,
    year: 2023,
  },
  {
    slug: "capital-and-conviction",
    title: "Capital & Conviction",
    author: "Idris Bello",
    category: "finance",
    description:
      "How great investors hold their nerve when the market rewards panic.",
    cover: ["#28241a", "#12100b"],
    pageCount: 330,
    year: 2020,
  },
  {
    slug: "the-attention-economy",
    title: "The Attention Economy",
    author: "Priya Nair",
    category: "mindset",
    description:
      "Reclaiming the most valuable resource you own in a world engineered to spend it.",
    cover: ["#1a2430", "#0b1017"],
    pageCount: 288,
    year: 2022,
  },
  {
    slug: "first-principles",
    title: "First Principles",
    author: "Maya Renard",
    category: "science",
    description:
      "A method for thinking from the ground up when the map you were handed is wrong.",
    cover: ["#301a1a", "#160a0a"],
    pageCount: 344,
    year: 2019,
  },
  {
    slug: "the-operating-manual",
    title: "The Operating Manual",
    author: "Samuel Ortiz",
    category: "business",
    description:
      "Running a company that scales without losing the taste that made it worth building.",
    cover: ["#14202a", "#080f14"],
    pageCount: 372,
    year: 2023,
  },
];

// The one real, readable book — a How It Works magazine served as a static PDF.
export const FEATURED_PDF_BOOK: Book = {
  id: "how-it-works-215",
  slug: "how-it-works-215",
  title: "How It Works — Issue 215",
  author: "How It Works Magazine",
  category: cat("science"),
  description:
    "The award-winning science and technology magazine. Read the full issue in a real, flip-through reader.",
  coverColor: ["#0b3a63", "#061a2e"],
  pageCount: 7,
  status: "active",
  year: 2026,
  featured: true,
  pdf: "/how-it-works-215.pdf",
  createdAt: "2026-01-15T09:00:00.000Z",
};

export const BOOKS: Book[] = [
  FEATURED_PDF_BOOK,
  ...SEEDS.map((s, i) => ({
    id: `book-${i + 1}`,
    slug: s.slug,
    title: s.title,
    author: s.author,
    category: cat(s.category),
    description: s.description,
    coverColor: s.cover,
    pageCount: s.pageCount,
    status: s.status ?? "active",
    year: s.year,
    featured: s.featured,
    createdAt: new Date(2024, (i * 2) % 12, ((i * 5) % 27) + 1).toISOString(),
  })),
];

CATEGORIES.forEach((c) => {
  c.bookCount = BOOKS.filter((b) => b.category.slug === c.slug).length;
});

export const getBookById = (id: string) => BOOKS.find((b) => b.id === id);
export const getBookBySlug = (slug: string) =>
  BOOKS.find((b) => b.slug === slug);
export const getCategoryBySlug = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug);
