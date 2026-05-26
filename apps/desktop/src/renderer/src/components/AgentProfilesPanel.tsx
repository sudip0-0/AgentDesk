import { useEffect, useState } from "react";
import type { AgentProfileInput, AgentProfileRecord } from "../../../shared/agentProfileTypes";
import {
  agentProfileModes,
  agentPromptDeliveries,
  agentWorkingDirectoryBehaviors
} from "../../../shared/agentProfileTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentProfileInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const deleteProfile = profiles.find((profile) => profile.id === deleteId) ?? null;

  const loadProfiles = async (): Promise<void> => {
    setError(null);

    try {
      const loadedProfiles: AgentProfileRecord[] = await window.agentdesk.agentProfiles.list();
      setProfiles(loadedProfiles);
      setSelectedProfileId((current) =>
        current && loadedProfiles.some((profile) => profile.id === current)
          ? current
          : loadedProfiles[0]?.id ?? null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load agent profiles.");
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

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
    setError(null);

    try {
      const saved = editingId
        ? await window.agentdesk.agentProfiles.update({ ...draft, id: editingId })
        : await window.agentdesk.agentProfiles.create(draft);

      setMessage(editingId ? "Agent profile updated." : "Agent profile created.");
      setSelectedProfileId(saved.id);
      closeDialog();
      await loadProfiles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save agent profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteId) {
      return;
    }

    setError(null);

    try {
      await window.agentdesk.agentProfiles.delete({ id: deleteId });
      setMessage("Agent profile deleted.");
      setDeleteId(null);
      await loadProfiles();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete agent profile.");
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Agent Profiles</h2>
          <Button onClick={openCreate} variant="primary">
            New Profile
          </Button>
        </div>

        {message ? (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-[#bfe9e3]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
            {error}
          </div>
        ) : null}

        {profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardTitle>No profiles</CardTitle>
            <CardDescription>Create a CLI profile before launching task agents.</CardDescription>
          </Card>
        ) : null}

        {profiles.map((profile) => (
          <button
            className={cn(
              "rounded-lg border bg-panel p-3 text-left transition hover:bg-panel-strong",
              profile.id === selectedProfile?.id ? "border-accent/60" : "border-border"
            )}
            key={profile.id}
            onClick={() => setSelectedProfileId(profile.id)}
            type="button"
          >
            <span className="block text-sm font-bold text-text">{profile.name}</span>
            <span className="mt-1 block truncate text-xs text-muted">{profile.command}</span>
          </button>
        ))}
      </div>

      <AgentProfileDetail
        onDelete={(profile) => setDeleteId(profile.id)}
        onEdit={openEdit}
        profile={selectedProfile}
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
  onEdit,
  onDelete
}: {
  profile: AgentProfileRecord | null;
  onEdit: (profile: AgentProfileRecord) => void;
  onDelete: (profile: AgentProfileRecord) => void;
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
          <Badge>{modeLabels[profile.mode]}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => onEdit(profile)} variant="primary">
            Edit
          </Button>
          <Button onClick={() => onDelete(profile)} variant="danger">
            Delete
          </Button>
        </div>
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
        className="rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
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
        className="min-h-24 w-full resize-y rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
