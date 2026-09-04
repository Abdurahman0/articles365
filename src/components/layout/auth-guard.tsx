"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export function AuthGuard({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (adminOnly && user.role !== "admin") router.replace("/dashboard");
  }, [hydrated, user, adminOnly, router]);

  if (!hydrated || !user || (adminOnly && user.role !== "admin")) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
