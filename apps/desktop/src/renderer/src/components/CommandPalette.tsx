import { useEffect, useMemo, useState } from "react";
import { Dialog } from "./ui/Dialog";

export interface CommandPaletteAction {
  id: string;
  label: string;
  shortcut: string;
  run: () => void;
}

export function CommandPalette({
  actions,
  open,
  onClose
}: {
  actions: CommandPaletteAction[];
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");

  // Reset the filter each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return actions;
    }

    return actions.filter((action) => action.label.toLowerCase().includes(term));
  }, [actions, query]);

  const select = (action: CommandPaletteAction | undefined): void => {
    if (!action) {
      return;
    }

    action.run();
    onClose();
  };

  return (
    <Dialog
      description="Type to filter, Enter to run the top result."
      onClose={onClose}
      open={open}
      title="Command Palette"
    >
      <input
        autoFocus
        className="mb-3 w-full rounded-md border border-border bg-code px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            select(filtered[0]);
          }
        }}
        placeholder="Search commands..."
        type="text"
        value={query}
      />
      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">No matching commands.</p>
        ) : (
          filtered.map((action) => (
            <button
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border bg-inset px-3 py-2 text-left transition hover:border-accent/60 hover:bg-panel-strong"
              key={action.id}
              onClick={() => select(action)}
              type="button"
            >
              <span className="text-sm font-bold text-text">{action.label}</span>
              <kbd className="rounded border border-border bg-code px-2 py-1 text-xs text-muted">
                {action.shortcut}
              </kbd>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
