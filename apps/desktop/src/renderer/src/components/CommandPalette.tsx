import { Button } from "./ui/Button";
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
  return (
    <Dialog
      description="Use keyboard shortcuts or choose an action."
      onClose={onClose}
      open={open}
      title="Command Palette"
    >
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border bg-[#10161d] px-3 py-2 text-left transition hover:border-accent/60 hover:bg-panel-strong"
            key={action.id}
            onClick={() => {
              action.run();
              onClose();
            }}
            type="button"
          >
            <span className="text-sm font-bold text-text">{action.label}</span>
            <kbd className="rounded border border-border bg-[#0d1117] px-2 py-1 text-xs text-muted">
              {action.shortcut}
            </kbd>
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button onClick={onClose} variant="ghost">
          Close
        </Button>
      </div>
    </Dialog>
  );
}
