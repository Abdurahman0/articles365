"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { AdminSidebar, ADMIN_NAV } from "@/components/admin/admin-sidebar";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth";
import { initials } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard adminOnly>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon-sm" className="lg:hidden"><Menu /></Button></SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center px-5"><Logo /></div>
                <nav className="space-y-1 px-3">
                  {ADMIN_NAV.map((i) => (
                    <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <i.icon className="size-4" /> {i.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <p className="text-sm font-medium text-muted-foreground">Admin Console</p>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle className="!size-9 !rounded-xl" />
              <Button variant="ghost" size="sm" onClick={() => { logout(); router.push("/login"); }}>
                <LogOut className="size-4" /> Sign out
              </Button>
              <Avatar className="size-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials(user?.fullName ?? "A")}</AvatarFallback></Avatar>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
