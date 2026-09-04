import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BookCover } from "@/components/books/book-cover";
import { BOOKS } from "@/data/catalog";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const showcase = BOOKS.filter((b) => b.featured).slice(0, 3);
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="brand-backdrop relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <Logo />
        <div className="relative">
          <div className="flex gap-4">
            {showcase.map((b, i) => (
              <div key={b.id} className="w-32" style={{ transform: `translateY(${i === 1 ? -16 : 0}px)` }}>
                <BookCover book={b} size="sm" />
              </div>
            ))}
          </div>
          <blockquote className="mt-10 max-w-md text-2xl font-medium leading-snug tracking-tight">
            “The most durable ideas rarely announce themselves; they arrive
            quietly and only later reveal their weight.”
          </blockquote>
          <p className="mt-3 text-sm text-muted-foreground">Signals &amp; Noise — Maya Renard</p>
        </div>
        <p className="relative text-xs text-muted-foreground">© 2026 365 Magazines</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
