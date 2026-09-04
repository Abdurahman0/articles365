import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6">
        <Logo href="/books" showWordmark={false} />
        <p className="text-xs text-muted-foreground">© 2026 365 Magazines · Articles365</p>
      </div>
    </footer>
  );
}
