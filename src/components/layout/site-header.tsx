"use client";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo href="/books" />
        <ThemeToggle className="!size-9 !rounded-xl" />
      </div>
    </header>
  );
}
