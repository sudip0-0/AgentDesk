import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "./Card";

/**
 * Consistent empty/placeholder state with an optional primary action.
 * Use for "no data yet" situations across screens.
 */
export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <Card className={className ?? "border-dashed"}>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
      {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
    </Card>
  );
}
