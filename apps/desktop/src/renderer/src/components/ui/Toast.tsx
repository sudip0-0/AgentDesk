import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type Toast,
  type ToastVariant
} from "../../lib/toast";

const variantClasses: Record<ToastVariant, string> = {
  info: "border-accent/40 bg-accent/10 text-accent-soft",
  success: "border-accent/40 bg-accent/10 text-accent-soft",
  error: "border-danger/45 bg-danger/10 text-danger-soft"
};

export function ToastContainer(): React.JSX.Element {
  const [items, setItems] = useState<Toast[]>(getToasts());

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {items.map((toast) => (
        <div
          className={cn(
            "pointer-events-auto flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm shadow-lg",
            variantClasses[toast.variant]
          )}
          key={toast.id}
          role={toast.variant === "error" ? "alert" : "status"}
        >
          <span className="min-w-0 break-words">{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            className="shrink-0 text-muted hover:text-text"
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
