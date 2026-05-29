import type { ReactNode } from "react";
import { Card } from "./Card";

/** Compact dashboard metric: a label, a large value, and optional detail/badge. */
export function MetricCard({
  label,
  value,
  detail,
  accessory
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accessory?: ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
        {accessory ?? null}
      </div>
      <div className="mt-2 text-2xl font-bold text-text">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}
    </Card>
  );
}
