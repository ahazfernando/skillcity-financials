import { Badge } from "@/components/ui/badge";
import { PaymentStatus } from "@/types/financial";

interface StatusBadgeProps {
  status: PaymentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    pending: "bg-warning text-warning-foreground",
    received: "bg-success text-success-foreground",
    overdue: "bg-destructive text-destructive-foreground"
  };

  return (
    <Badge className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
