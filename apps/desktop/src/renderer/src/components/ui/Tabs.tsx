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
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="tablist">
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              isActive
                ? "border-accent/50 bg-panel-strong text-text"
                : "border-border bg-[#10161d] text-muted hover:text-text"
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            role="tab"
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
