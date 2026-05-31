import { useEffect, useState } from "react";
import {
  IDLE_WARNING_SECONDS_MAX,
  IDLE_WARNING_SECONDS_MIN,
  type AppSettings
} from "../../../shared/settingsTypes";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Input } from "./ui/Input";
import { pushToast } from "../lib/toast";

const shortcutHelp =
  "Ctrl+Shift+P palette · Ctrl+Shift+N create task · Ctrl+Shift+L launch agent · Ctrl+Shift+Q run checks · Ctrl+Shift+` terminal · Ctrl+Tab switch terminal tabs · Ctrl+1-9 switch screens.";

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps): React.JSX.Element {
  return (
    <label className="flex items-start justify-between gap-4 rounded-md border border-border bg-inset px-3 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-text">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <input
        checked={checked}
        className="mt-1 size-4 shrink-0"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

export function SettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void window.agentdesk.settings
      .get()
      .then((loaded: AppSettings) => {
        if (!cancelled) {
          setSettings(loaded);
          setDraft(loaded);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = (patch: Partial<AppSettings>): void => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const isDirty = Boolean(settings && draft && JSON.stringify(settings) !== JSON.stringify(draft));

  const save = async (): Promise<void> => {
    if (!draft) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = await window.agentdesk.settings.update(draft);
      setSettings(saved);
      setDraft(saved);
      pushToast("Settings saved.", "success");
    } catch (saveError) {
      pushToast(saveError instanceof Error ? saveError.message : "Failed to save settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!draft) {
    return (
      <Card className="border-dashed">
        <CardTitle>Settings</CardTitle>
        <CardDescription>{error ?? "Loading settings..."}</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid content-start gap-4 xl:max-w-3xl">
      <Card>
        <CardTitle>Safety & Approvals</CardTitle>
        <CardDescription>Control how AgentDesk guards command execution and agent launches.</CardDescription>

        <div className="mt-4 grid gap-2">
          <ToggleRow
            checked={draft.blockDestructiveCommands}
            description="Block clearly destructive commands (rm -rf, git reset --hard, disk format, secret reads) in quality checks and agent launches."
            label="Block destructive commands"
            onChange={(value) => updateDraft({ blockDestructiveCommands: value })}
          />
          <ToggleRow
            checked={draft.requireAgentLaunchApproval}
            description="Show a command preview and confirmation before launching an agent from a task."
            label="Require agent launch approval"
            onChange={(value) => updateDraft({ requireAgentLaunchApproval: value })}
          />
          <ToggleRow
            checked={draft.confirmDestructiveGit}
            description="Ask for confirmation before commits and branch operations."
            label="Confirm destructive git actions"
            onChange={(value) => updateDraft({ confirmDestructiveGit: value })}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Process Watchdog</CardTitle>
        <CardDescription>Flag a running agent as idle when it stops producing output.</CardDescription>

        <div className="mt-4 max-w-xs">
          <Input
            label={`Idle warning after (seconds, ${IDLE_WARNING_SECONDS_MIN}-${IDLE_WARNING_SECONDS_MAX})`}
            max={IDLE_WARNING_SECONDS_MAX}
            min={IDLE_WARNING_SECONDS_MIN}
            onChange={(event) => {
              const value = Number(event.target.value);
              updateDraft({
                idleWarningSeconds: Number.isFinite(value) ? value : draft.idleWarningSeconds
              });
            }}
            type="number"
            value={draft.idleWarningSeconds}
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button disabled={!isDirty || isSaving} onClick={() => void save()} variant="primary">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          disabled={!isDirty || isSaving}
          onClick={() => setDraft(settings)}
          variant="ghost"
        >
          Reset
        </Button>
      </div>

      <Card>
        <CardTitle>Keyboard Shortcuts</CardTitle>
        <CardDescription>{shortcutHelp}</CardDescription>
      </Card>
    </section>
  );
}
