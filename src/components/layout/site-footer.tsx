import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLS = [
  {
    title: "Platform",
    links: [
      { label: "Books", href: "/books" },
      { label: "Categories", href: "/categories" },
      { label: "My Library", href: "/library" },
      { label: "Reader", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/about" },
      { label: "Careers", href: "/about" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/about" },
      { label: "Privacy", href: "/about" },
      { label: "Content Policy", href: "/about" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              A premium protected reading platform. Own your library, read
              securely, keep every note.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="eyebrow text-muted-foreground">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-foreground/70 transition-colors hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 365 Magazines. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="transition-colors hover:text-foreground">Twitter</span>
            <span className="transition-colors hover:text-foreground">Instagram</span>
            <span className="transition-colors hover:text-foreground">Telegram</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
