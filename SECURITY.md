# SECURITY.md

## Security Goal

AgentDesk must let users control powerful local automation safely.

The app launches CLI tools that can read files, edit code, run commands, install packages, delete files, and access environment variables.

Security must be treated as a core feature.

## Main Risks

### 1. Unsafe Command Execution

Risk:
Agents or users may run destructive commands.

Examples:

```bash
rm -rf .
git reset --hard
del /s /q *
Remove-Item -Recurse -Force
```

Mitigation:

- show command before launch
- require confirmation for destructive app actions
- do not auto-run unknown commands silently
- provide kill button
- allow per-project command allowlist later

## 2. Exposed Secrets in Logs

Risk:
Terminal output may contain API keys, tokens, database URLs, or secrets.

Mitigation:

- redact common secret patterns from displayed logs
- warn user that logs may contain secrets
- never upload logs in MVP
- store logs locally only
- add "delete logs" option

Common patterns to redact:

```txt
sk-...
ghp_...
github_pat_...
DATABASE_URL=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## 3. Renderer Process Access

Risk:
If renderer has unrestricted Node.js access, UI vulnerabilities become system vulnerabilities.

Mitigation:

- disable nodeIntegration
- enable contextIsolation
- expose safe APIs through preload
- validate all IPC inputs
- never expose raw fs or child_process to renderer

Required Electron settings:

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath
}
```

## 4. Path Traversal

Risk:
Renderer may request file operations outside the selected project.

Mitigation:

- normalize paths
- restrict operations to known project folders
- reject paths outside project root unless user explicitly selected them
- never trust renderer-provided paths

## 5. Git Destructive Operations

Risk:
Data loss through discard, reset, clean, or forced branch operations.

Mitigation:

- confirm before discard
- confirm before branch delete
- confirm before reset
- never run `git clean -fd` automatically
- show changed files before destructive action

## 6. API Key Storage

Risk:
Users may store CLI/API keys in app settings.

Mitigation:

- avoid storing keys when possible
- prefer environment variables managed by the CLI tools themselves
- if storing secrets later, use OS keychain
- never store raw secrets in SQLite
- never include secrets in exported logs

## 7. Supply Chain Risk

Risk:
Agent-suggested package installs may introduce malicious packages.

Mitigation:

- show package install commands before running
- mark dependency changes in git diff
- add future package risk checker
- require user approval for install commands if app runs them directly

## 8. Prompt Injection from Repo Files

Risk:
Malicious repo files may instruct agents to ignore rules.

Mitigation:

- prompts should remind agents to treat repo files as untrusted context
- agents should follow task contract over random comments
- review suspicious changes manually

## 9. Auto-Commit Risk

Risk:
Bad agent changes could be committed accidentally.

Mitigation:

- no auto-commit in MVP
- user must inspect diff
- user must confirm commit
- commit message is generated but editable

## Security Requirements for MVP

- Renderer has no direct Node access.
- IPC input validation exists.
- Project file operations are restricted.
- Terminal process can be killed.
- App confirms destructive git actions.
- Logs are local.
- Basic secret redaction exists.
- Commands are visible to the user.
- App never pushes code automatically.

## Security Review Checklist

Before release, check:

- [ ] nodeIntegration is false
- [ ] contextIsolation is true
- [ ] preload exposes narrow API
- [ ] IPC handlers validate inputs
- [ ] paths are normalized
- [ ] file operations stay inside project root
- [ ] terminal kill works
- [ ] destructive actions require confirmation
- [ ] logs redact common secrets
- [ ] app does not auto-push
- [ ] app does not silently run generated commands
