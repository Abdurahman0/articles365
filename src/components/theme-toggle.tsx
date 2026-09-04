"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/stores/theme";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const mounted = useMounted();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40",
        className
      )}
    >
      {mounted && theme === "dark" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
    </button>
  );
}
