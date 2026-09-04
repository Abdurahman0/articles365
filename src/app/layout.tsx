import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SecurityGuard } from "@/components/security-guard";
import { THEME_INIT_SCRIPT } from "@/stores/theme";

export const metadata: Metadata = {
  title: {
    default: "Articles365 — Premium Protected Reading",
    template: "%s · Articles365",
  },
  description:
    "A premium protected digital book platform. Your personal library, protected reader, notes and highlights — by 365 Magazines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <SecurityGuard />
        <Providers>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
