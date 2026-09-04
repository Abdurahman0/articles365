import { Badge } from "@/components/ui/badge";
import type { ReadingStatus } from "@/types";

const MAP: Record<ReadingStatus, { label: string; variant: "default" | "primary" | "success" }> = {
  new: { label: "New", variant: "default" },
  reading: { label: "Reading", variant: "primary" },
  completed: { label: "Completed", variant: "success" },
};

export function ReadingStatusBadge({ status }: { status: ReadingStatus }) {
  const m = MAP[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
