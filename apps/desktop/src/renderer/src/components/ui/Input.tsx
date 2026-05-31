import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ className, label, id, ...props }: InputProps): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-1.5" htmlFor={inputId}>
      {label ? <span className="text-xs font-bold text-muted">{label}</span> : null}
      <input
        className={cn(
          "w-full rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60",
          className
        )}
        id={inputId}
        {...props}
      />
    </label>
  );
}
