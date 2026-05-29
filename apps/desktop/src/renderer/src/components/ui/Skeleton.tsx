import { cn } from "../../lib/cn";
import { Card } from "./Card";

/** A single shimmering placeholder bar. */
export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded bg-panel-strong", className)}
    />
  );
}

/** A card-shaped loading placeholder with a few lines, for slow IPC reads. */
export function SkeletonCard({
  lines = 3,
  className
}: {
  lines?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <Card className={className} aria-busy="true" role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-3 grid gap-2">
        {Array.from({ length: lines }, (_unused, index) => (
          <Skeleton className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")} key={index} />
        ))}
      </div>
    </Card>
  );
}
