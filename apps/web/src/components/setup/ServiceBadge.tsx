"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

export type ServiceStatus = "ok" | "warn" | "down";

interface ServiceBadgeProps {
  status: ServiceStatus;
  label: string;
  detail?: string;
}

export function ServiceBadge({ status, label, detail }: ServiceBadgeProps) {
  const Icon =
    status === "ok"
      ? CheckCircle2
      : status === "warn"
        ? AlertCircle
        : Circle;
  const iconClass =
    status === "ok"
      ? "text-green-600"
      : status === "warn"
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
      <div className="min-w-0">
        <span>{label}</span>
        {detail && (
          <p className="text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
    </div>
  );
}
