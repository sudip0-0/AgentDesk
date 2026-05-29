import { Badge } from "./Badge";

type BadgeVariant = "default" | "success" | "warning" | "danger";

interface StatusStyle {
  label: string;
  variant: BadgeVariant;
}

/**
 * Single source of truth for domain status -> badge style + label.
 * Covers run, task, quality, agent, and terminal-activity statuses so every
 * screen renders the same concept identically.
 */
const STATUS_STYLES: Record<string, StatusStyle> = {
  // Run / process lifecycle
  queued: { label: "Queued", variant: "default" },
  running: { label: "Running", variant: "success" },
  waiting_for_input: { label: "Waiting", variant: "warning" },
  waiting: { label: "Waiting", variant: "warning" },
  idle: { label: "Idle", variant: "warning" },
  starting: { label: "Starting", variant: "warning" },
  cancelling: { label: "Cancelling", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "default" },
  killed: { label: "Cancelled", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  exited: { label: "Exited", variant: "default" },
  failed: { label: "Failed", variant: "danger" },
  error: { label: "Error", variant: "danger" },

  // Task statuses
  backlog: { label: "Backlog", variant: "default" },
  ready: { label: "Ready", variant: "default" },
  needs_review: { label: "Needs Review", variant: "warning" },
  blocked: { label: "Blocked", variant: "danger" },
  done: { label: "Done", variant: "success" },

  // Quality check statuses
  passed: { label: "Passed", variant: "success" },
  skipped: { label: "Skipped", variant: "warning" },

  // Review statuses
  warning: { label: "Warning", variant: "warning" },

  // Agent availability
  installed: { label: "Installed", variant: "success" },
  ready_agent: { label: "Ready", variant: "success" },
  missing: { label: "Missing", variant: "danger" },
  unknown: { label: "Unknown", variant: "default" }
};

const fallbackStyle = (status: string): StatusStyle => ({
  label: status
    .split("_")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" "),
  variant: "default"
});

export function StatusBadge({
  status,
  className,
  label
}: {
  status: string;
  className?: string;
  /** Override the default label while keeping the mapped color. */
  label?: string;
}): React.JSX.Element {
  const style = STATUS_STYLES[status] ?? fallbackStyle(status);

  return (
    <Badge className={className} variant={style.variant}>
      {label ?? style.label}
    </Badge>
  );
}
