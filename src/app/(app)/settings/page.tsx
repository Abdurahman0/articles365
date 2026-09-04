"use client";

import Link from "next/link";
import { ChevronRight, MonitorSmartphone, Palette, Shield, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useReaderPrefs } from "@/stores/reader-prefs";
import { useTheme } from "@/stores/theme";
import { useMounted } from "@/hooks/use-mounted";
import type { ReaderTheme } from "@/types";

const THEMES: { value: ReaderTheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "sepia", label: "Sepia" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const mounted = useMounted();
  const theme = useReaderPrefs((s) => s.theme);
  const setTheme = useReaderPrefs((s) => s.setTheme);
  const uiTheme = useTheme((s) => s.theme);
  const toggleUi = useTheme((s) => s.toggle);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Settings" description="Preferences, security and connected devices." />

      {/* Account */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><User className="size-4" /></span>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/profile" className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/40">
            <span>Edit profile information</span><ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Palette className="size-4" /></span>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Dark interface</p><p className="text-xs text-muted-foreground">Switch between the warm light and navy dark themes.</p></div>
            <Switch checked={mounted && uiTheme === "dark"} onCheckedChange={toggleUi} />
          </div>
          <div>
            <p className="text-sm font-medium">Default reading theme</p>
            <p className="mb-3 text-xs text-muted-foreground">Applied when you open a book.</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.value} onClick={() => setTheme(t.value)}
                  className={`rounded-lg border p-3 text-sm transition-colors ${mounted && theme === t.value ? "border-primary/50 bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Shield className="size-4" /></span>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Current password</Label><Input type="password" placeholder="••••••••" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" placeholder="New password" /></div>
            <div className="space-y-1.5"><Label>Confirm</Label><Input type="password" placeholder="Confirm" /></div>
          </div>
          <Button variant="secondary">Update password</Button>
        </CardContent>
      </Card>

      {/* Devices */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><MonitorSmartphone className="size-4" /></span>
          <CardTitle>Devices & Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/settings/sessions" className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/40">
            <span>Manage active sessions</span><ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
