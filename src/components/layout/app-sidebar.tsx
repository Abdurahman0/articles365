"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./app-nav";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
      <item.icon className={cn("size-4", active && "text-primary")} />
      {item.label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map((i) => (
          <NavLink key={i.href} item={i} active={isActive(i.href)} />
        ))}
        <div className="my-3 h-px bg-border" />
        {SECONDARY_NAV.map((i) => (
          <NavLink key={i.href} item={i} active={isActive(i.href)} />
        ))}
        {user?.role === "admin" && (
          <Link
            href="/admin"
            className="mt-1 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ShieldCheck className="size-4" /> Admin panel
          </Link>
        )}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/books" className="block rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          Browse catalog →
        </Link>
      </div>
    </aside>
  );
}
