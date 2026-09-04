import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  size = 36,
  showWordmark = true,
  href = "/",
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className={cn("flex items-center gap-2.5 select-none", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10"
        style={{ width: size, height: size }}
      >
        <Image src="/logo.png" alt="365 Magazines" fill sizes={`${size}px`} className="object-cover" priority />
      </span>
      {showWordmark && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-tight text-foreground">
            ARTICLES<span className="text-primary">365</span>
          </span>
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            365 Magazines
          </span>
        </span>
      )}
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex tap-highlight-none">
      {inner}
    </Link>
  );
}
