"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "./app-nav";
import { cn } from "@/lib/utils";

export function MobileTabbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {MOBILE_NAV.map((i) => {
          const active = i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <i.icon className="size-5" />
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
