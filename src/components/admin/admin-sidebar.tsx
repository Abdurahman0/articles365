"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, BookText, KeyRound, LayoutDashboard, MonitorSmartphone, Tags, Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface Item { href: string; label: string; icon: LucideIcon; }
export const ADMIN_NAV: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/books", label: "Books", icon: BookText },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/access", label: "Access", icon: KeyRound },
  { href: "/admin/sessions", label: "Sessions", icon: MonitorSmartphone },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <Logo showWordmark={false} href="/admin" />
        <div>
          <p className="text-sm font-semibold leading-none">Admin</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {ADMIN_NAV.map((i) => (
          <Link key={i.href} href={i.href}
            className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active(i.href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}>
            {active(i.href) && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
            <i.icon className={cn("size-4", active(i.href) && "text-primary")} /> {i.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to app
        </Link>
      </div>
    </aside>
  );
}
