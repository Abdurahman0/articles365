import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/types";

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant={status === "active" ? "success" : "destructive"}>
      {status === "active" ? "Active" : "Blocked"}
    </Badge>
  );
}
