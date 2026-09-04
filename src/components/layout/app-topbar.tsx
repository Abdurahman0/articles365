"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut, Menu, Search, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRIMARY_NAV, SECONDARY_NAV } from "./app-nav";
import { useAuthStore } from "@/stores/auth";
import { initials } from "@/lib/utils";

export function AppTopbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  function signOut() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Menu"><Menu /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center px-5"><Logo /></div>
          <nav className="space-y-1 px-3">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                <i.icon className="size-4" /> {i.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="hidden lg:block lg:w-2" />

      {/* Search */}
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          onKeyDown={(e) => { if (e.key === "Enter") router.push("/library"); }}
          placeholder="Search your library…"
          className="h-10 w-full rounded-lg border border-input bg-card/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle className="!size-9 !rounded-xl" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
              <Bell />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2.5 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-2.5 transition-colors hover:border-primary/40">
              <Avatar className="size-7"><AvatarFallback className="bg-primary text-[11px] text-primary-foreground">{initials(user?.fullName ?? "U")}</AvatarFallback></Avatar>
              <span className="hidden max-w-28 truncate text-sm md:block">{user?.fullName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? user?.phone}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/profile"><UserIcon /> Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings"><Settings /> Settings</Link></DropdownMenuItem>
            {user?.role === "admin" && (
              <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck /> Admin panel</Link></DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
