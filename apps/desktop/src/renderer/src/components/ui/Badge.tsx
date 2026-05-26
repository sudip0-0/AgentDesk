import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-panel-strong text-muted",
  success: "bg-accent/15 text-[#bfe9e3]",
  warning: "bg-accent-strong/20 text-[#ffe0a3]",
  danger: "bg-danger/20 text-[#ffd0d0]"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
