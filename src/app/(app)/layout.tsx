import { AuthGuard } from "@/components/layout/auth-guard";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileTabbar } from "@/components/layout/mobile-tabbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileTabbar />
    </AuthGuard>
  );
}
