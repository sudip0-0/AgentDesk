import { useCallback, useEffect, useState } from "react";
import type { AgentProfileInput, AgentProfileRecord } from "../../../shared/agentProfileTypes";
import {
  agentProfileModes,
  agentPromptDeliveries,
  agentWorkingDirectoryBehaviors
} from "../../../shared/agentProfileTypes";
import type { AgentAvailability, AgentCommandTestResult } from "../../../shared/agentAvailability";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { StatusBadge } from "./ui/StatusBadge";
import { pushToast } from "../lib/toast";
import { cn } from "../lib/cn";

const emptyProfile: AgentProfileInput = {
  name: "",
  command: "",
  argsTemplate: "",
  shell: "powershell",
  mode: "interactive",
  envText: "",
  workingDirectoryBehavior: "project_root",
  promptDelivery: "send_to_stdin"
};

const modeLabels = {
  interactive: "Interactive",
  one_shot: "One-shot"
};

const promptDeliveryLabels = {
  manual: "Manual",
  send_to_stdin: "Send to stdin",
  argument: "Prompt argument"
};

const workingDirectoryLabels = {
  project_root: "Project root",
  terminal_cwd: "Terminal cwd"
};

export function AgentProfilesPanel(): React.JSX.Element {
  const [profiles, setProfiles] = useState<AgentProfileRecord[]>([]);
  const [availability, setAvailability] = useState<Record<string, AgentAvailability>>({});
  const [testResult, setTestResult] = useState<AgentCommandTestResult | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentProfileInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const deleteProfile = profiles.find((profile) => profile.id === deleteId) ?? null;

  const loadAvailability = useCallback(async (): Promise<void> => {
    try {
      const entries: AgentAvailability[] = await window.agentdesk.agentProfiles.listAvailability();
      setAvailability(
        Object.fromEntries(entries.map((entry) => [entry.profileId, entry]))
      );
    } catch {
      // Availability is best-effort; ignore probe failures so the panel still loads.
    }
  }, []);

  const loadProfiles = useCallback(async (): Promise<void> => {
    try {
      const loadedProfiles: AgentProfileRecord[] = await window.agentdesk.agentProfiles.list();
      setProfiles(loadedProfiles);
      setSelectedProfileId((current) =>
        current && loadedProfiles.some((profile) => profile.id === current)
          ? current
          : loadedProfiles[0]?.id ?? null
      );
      await loadAvailability();
    } catch (loadError) {
      pushToast(loadError instanceof Error ? loadError.message : "Failed to load agent profiles.", "error");
    }
  }, [loadAvailability]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  // Re-probe agent availability when the window regains focus (tools may be installed mid-session).
  useEffect(() => {
    const refresh = (): void => {
      void loadAvailability();
    };

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [loadAvailability]);

  const runCommandTest = async (profile: AgentProfileRecord): Promise<void> => {
    setTestingId(profile.id);
    setTestResult(null);

    try {
      const result = await window.agentdesk.agentProfiles.test({ id: profile.id });
      setTestResult(result);
      setAvailability((current) => ({
        ...current,
        [profile.id]: {
          profileId: profile.id,
          command: result.command,
          installed: result.installed,
          resolvedPath: current[profile.id]?.resolvedPath ?? null,
          message: result.message
        }
      }));
    } catch (testError) {
      pushToast(testError instanceof Error ? testError.message : "Failed to test agent command.", "error");
    } finally {
      setTestingId(null);
    }
  };

  const openCreate = (): void => {
    setEditingId(null);
    setDraft(emptyProfile);
  };

  const openEdit = (profile: AgentProfileRecord): void => {
    setEditingId(profile.id);
    setDraft({
      name: profile.name,
      command: profile.command,
      argsTemplate: profile.argsTemplate,
      shell: profile.shell,
      mode: profile.mode,
      envText: profile.envText,
      workingDirectoryBehavior: profile.workingDirectoryBehavior,
      promptDelivery: profile.promptDelivery
    });
  };

  const closeDialog = (): void => {
    setDraft(null);
    setEditingId(null);
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = editingId
        ? await window.agentdesk.agentProfiles.update({ ...draft, id: editingId })
        : await window.agentdesk.agentProfiles.create(draft);

      pushToast(editingId ? "Agent profile updated." : "Agent profile created.", "success");
      setSelectedProfileId(saved.id);
      closeDialog();
      await loadProfiles();
    } catch (saveError) {
      pushToast(saveError instanceof Error ? saveError.message : "Failed to save agent profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteId) {
      return;
    }

    try {
      await window.agentdesk.agentProfiles.delete({ id: deleteId });
      pushToast("Agent profile deleted.", "success");
      setDeleteId(null);
      await loadProfiles();
    } catch (deleteError) {
      pushToast(deleteError instanceof Error ? deleteError.message : "Failed to delete agent profile.", "error");
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Agent Profiles</h2>
          <div className="flex gap-2">
            <Button onClick={() => void loadAvailability()} size="sm" variant="secondary">
              Refresh Status
            </Button>
            <Button onClick={openCreate} variant="primary">
              New Profile
            </Button>
          </div>
        </div>

        {profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardTitle>No profiles</CardTitle>
            <CardDescription>Create a CLI profile before launching task agents.</CardDescription>
          </Card>
        ) : null}

        {profiles.map((profile) => {
          const status = availability[profile.id];

          return (
            <button
              className={cn(
                "rounded-lg border bg-panel p-3 text-left transition hover:bg-panel-strong",
                profile.id === selectedProfile?.id ? "border-accent/60" : "border-border"
              )}
              key={profile.id}
              onClick={() => setSelectedProfileId(profile.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="block text-sm font-bold text-text">{profile.name}</span>
                <StatusBadge status={status ? (status.installed ? "installed" : "missing") : "unknown"} />
              </div>
              <span className="mt-1 block truncate text-xs text-muted">{profile.command}</span>
            </button>
          );
        })}
      </div>

      <AgentProfileDetail
        availability={selectedProfile ? availability[selectedProfile.id] ?? null : null}
        isTesting={testingId === selectedProfile?.id}
        onDelete={(profile) => setDeleteId(profile.id)}
        onEdit={openEdit}
        onTest={(profile) => void runCommandTest(profile)}
        profile={selectedProfile}
        testResult={testResult && testResult.profileId === selectedProfile?.id ? testResult : null}
      />

      <AgentProfileDialog
        draft={draft}
        isSaving={isSaving}
        mode={editingId ? "edit" : "create"}
        onChange={setDraft}
        onClose={closeDialog}
        onSave={() => void saveDraft()}
      />

      <Dialog
        description="Existing run history keeps its command and clears the profile reference."
        onClose={() => setDeleteId(null)}
        open={deleteProfile !== null}
        title={deleteProfile ? `Delete "${deleteProfile.name}"?` : "Delete profile"}
      >
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button onClick={() => setDeleteId(null)} variant="ghost">
            Cancel
          </Button>
          <Button onClick={() => void confirmDelete()} variant="danger">
            Delete Profile
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function AgentProfileDetail({
  profile,
  availability,
  testResult,
  isTesting,
  onEdit,
  onDelete,
  onTest
}: {
  profile: AgentProfileRecord | null;
  availability: AgentAvailability | null;
  testResult: AgentCommandTestResult | null;
  isTesting: boolean;
  onEdit: (profile: AgentProfileRecord) => void;
  onDelete: (profile: AgentProfileRecord) => void;
  onTest: (profile: AgentProfileRecord) => void;
}): React.JSX.Element {
  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardTitle>Profile Detail</CardTitle>
        <CardDescription>Select or create an agent profile.</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid content-start gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{profile.name}</CardTitle>
            <CardDescription>{profile.command}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {availability ? (
              <StatusBadge status={availability.installed ? "installed" : "missing"} />
            ) : null}
            <Badge>{modeLabels[profile.mode]}</Badge>
          </div>
        </div>
        {availability ? (
          <p className="mt-2 text-xs text-muted">{availability.message}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={isTesting} onClick={() => onTest(profile)} variant="secondary">
            {isTesting ? "Testing..." : "Test Command"}
          </Button>
          <Button onClick={() => onEdit(profile)} variant="primary">
            Edit
          </Button>
          <Button onClick={() => onDelete(profile)} variant="danger">
            Delete
          </Button>
        </div>
        {testResult ? (
          <div
            className={cn(
              "mt-3 rounded-md border px-3 py-2 text-xs",
              testResult.installed && testResult.exitCode === 0
                ? "border-accent/40 bg-accent/10 text-accent-soft"
                : "border-danger/45 bg-danger/10 text-danger-soft"
            )}
          >
            <p className="font-bold">{testResult.message}</p>
            {testResult.output ? (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted">
                {testResult.output}
              </pre>
            ) : null}
          </div>
        ) : null}
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle className="text-sm">Arguments Template</CardTitle>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{profile.argsTemplate || "None."}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">Prompt Delivery</CardTitle>
          <p className="mt-2 text-sm text-muted">{promptDeliveryLabels[profile.promptDelivery]}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">Shell</CardTitle>
          <p className="mt-2 text-sm text-muted">{profile.shell}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">Working Directory</CardTitle>
          <p className="mt-2 text-sm text-muted">
            {workingDirectoryLabels[profile.workingDirectoryBehavior]}
          </p>
        </Card>
      </section>

      <Card>
        <CardTitle className="text-sm">Environment Variables</CardTitle>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{profile.envText || "None."}</p>
      </Card>
    </section>
  );
}

function AgentProfileDialog({
  draft,
  mode,
  isSaving,
  onChange,
  onClose,
  onSave
}: {
  draft: AgentProfileInput | null;
  mode: "create" | "edit";
  isSaving: boolean;
  onChange: (draft: AgentProfileInput) => void;
  onClose: () => void;
  onSave: () => void;
}): React.JSX.Element {
  const updateField = (field: keyof AgentProfileInput, value: string): void => {
    if (!draft) {
      return;
    }

    onChange({ ...draft, [field]: value });
  };

  return (
    <Dialog
      description="Use {{prompt}}, {{task.id}}, {{task.title}}, {{project.name}}, or {{project.path}} in args."
      onClose={onClose}
      open={draft !== null}
      title={mode === "edit" ? "Edit Agent Profile" : "Create Agent Profile"}
    >
      {draft ? (
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Name"
              onChange={(event) => updateField("name", event.target.value)}
              value={draft.name}
            />
            <Input
              label="Command"
              onChange={(event) => updateField("command", event.target.value)}
              value={draft.command}
            />
          </div>

          <TextArea
            label="Args Template"
            onChange={(value) => updateField("argsTemplate", value)}
            value={draft.argsTemplate}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Shell"
              onChange={(value) => updateField("shell", value)}
              options={[
                { label: "PowerShell", value: "powershell" },
                { label: "CMD", value: "cmd" }
              ]}
              value={draft.shell}
            />
            <SelectField
              label="Mode"
              onChange={(value) => updateField("mode", value)}
              options={agentProfileModes.map((profileMode) => ({
                label: modeLabels[profileMode],
                value: profileMode
              }))}
              value={draft.mode}
            />
            <SelectField
              label="Working Directory Behavior"
              onChange={(value) => updateField("workingDirectoryBehavior", value)}
              options={agentWorkingDirectoryBehaviors.map((behavior) => ({
                label: workingDirectoryLabels[behavior],
                value: behavior
              }))}
              value={draft.workingDirectoryBehavior}
            />
            <SelectField
              label="Prompt Delivery"
              onChange={(value) => updateField("promptDelivery", value)}
              options={agentPromptDeliveries.map((delivery) => ({
                label: promptDeliveryLabels[delivery],
                value: delivery
              }))}
              value={draft.promptDelivery}
            />
          </div>

          <TextArea
            label="Environment Variables"
            onChange={(value) => updateField("envText", value)}
            placeholder="OPENAI_API_KEY=..."
            value={draft.envText}
          />
          <p className="text-xs text-muted">
            Values are passed to child processes. Do not store API keys or other secrets in profiles.
          </p>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={isSaving || draft.name.trim().length === 0 || draft.command.trim().length === 0}
              onClick={onSave}
              variant="primary"
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <select
        className="rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <textarea
        className="min-h-24 w-full resize-y rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
