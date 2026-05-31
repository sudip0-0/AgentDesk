export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

const emit = (): void => {
  for (const listener of listeners) {
    listener(toasts);
  }
};

export const dismissToast = (id: string): void => {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
};

/** Show a transient notification. Safe to call from anywhere in the renderer. */
export const pushToast = (message: string, variant: ToastVariant = "info"): void => {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => dismissToast(id), 5_000);
};

export const getToasts = (): Toast[] => toasts;

export const subscribeToasts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
