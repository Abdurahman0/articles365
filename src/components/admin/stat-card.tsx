import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label, value, icon: Icon, hint,
}: {
  label: string; value: string | number; icon: LucideIcon; hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span>
        {hint && <span className="text-xs text-emerald-400">{hint}</span>}
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
