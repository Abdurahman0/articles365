import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { DeviceKind, Session } from "@/types";

const ICON: Record<DeviceKind, typeof Monitor> = {
  windows: Monitor, mac: Laptop, linux: Monitor, iphone: Smartphone, android: Smartphone, web: Tablet,
};

export function SessionCard({
  session,
  onRevoke,
}: {
  session: Session;
  onRevoke?: (id: string) => void;
}) {
  const Icon = ICON[session.device];
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/80">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{session.deviceName}</p>
          {session.current && <Badge variant="success">This device</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {session.browser} · {session.os}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {session.location} · {session.ip} · {timeAgo(session.lastActive)}
        </p>
      </div>
      {!session.current && onRevoke && (
        <Button variant="outline" size="sm" onClick={() => onRevoke(session.id)}>
          Sign out
        </Button>
      )}
    </Card>
  );
}
