import { cn } from "@/lib/utils";
import type { Book } from "@/types";

export function BookCover({
  book,
  className,
  size = "md",
}: {
  book: Pick<Book, "title" | "author" | "coverColor" | "category">;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [from, to] = book.coverColor;
  const pad = size === "sm" ? "p-3" : size === "lg" ? "p-6" : "p-4";
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        pad,
        className
      )}
      style={{ backgroundImage: `linear-gradient(155deg, ${from}, ${to})` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, #fff, transparent 45%)" }} />
      <div className="pointer-events-none absolute -right-3 -top-6 text-[6rem] font-black leading-none text-white/[0.07]">
        365
      </div>
      <span className={cn("relative z-10 font-semibold uppercase tracking-[0.18em] text-white/50", size === "sm" ? "text-[8px]" : "text-[10px]")}>
        {book.category.name}
      </span>
      <div className="relative z-10">
        <div className="mb-2 h-px w-8 bg-primary/70" />
        <p className={cn("font-semibold leading-tight text-white", size === "sm" ? "text-[13px] line-clamp-2" : size === "lg" ? "text-xl line-clamp-4" : "text-[15px] line-clamp-3")}>
          {book.title}
        </p>
        <p className={cn("mt-1 font-medium text-white/55", size === "sm" ? "text-[10px]" : "text-xs")}>
          {book.author}
        </p>
      </div>
    </div>
  );
}
