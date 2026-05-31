import { useRef } from "react";
import { cn } from "../../lib/cn";

export interface TabItem {
  id: string;
  label: string;
  indicator?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps): React.JSX.Element {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number): void => {
    const target = items[index];
    if (!target) {
      return;
    }
    onChange(target.id);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number): void => {
    const lastIndex = items.length - 1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index === lastIndex ? 0 : index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index === 0 ? lastIndex : index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(lastIndex);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="tablist">
      {items.map((item, index) => {
        const isActive = item.id === activeId;

        return (
          <button
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              isActive
                ? "border-accent/50 bg-panel-strong text-text"
                : "border-border bg-inset text-muted hover:text-text"
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            <span className="max-w-[140px] truncate">{item.label}</span>
            {item.indicator ? <span className="size-1.5 rounded-full bg-accent" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
