import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-accent/50 bg-accent/15 text-[#bfe9e3] hover:bg-accent/25",
  secondary: "border-border bg-panel-strong text-text hover:bg-panel",
  ghost: "border-transparent bg-transparent text-muted hover:bg-panel-strong hover:text-text",
  danger: "border-danger/50 bg-danger/15 text-[#ffd0d0] hover:bg-danger/25"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm"
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      type={type}
      {...props}
    />
  );
}
