# TESTING.md

## Testing Strategy

AgentDesk must be tested at three levels:

1. core logic tests
2. Electron/main process integration tests
3. user workflow tests

Because the app launches terminals and local commands, testing should separate pure logic from OS-level behavior.

## Test Types

## 1. Unit Tests

Test pure modules:

- task engine
- prompt engine
- agent command builder
- quality command parser
- git output parser
- status parser
- database mappers

Recommended tools:

```txt
Vitest
ts-node
zod
```

Example commands:

```bash
npm test
npm run test:unit
```

## 2. Integration Tests

Test modules that touch local resources:

- SQLite database
- filesystem
- project detection
- git manager
- quality command runner
- PTY session manager

Use temporary folders for test projects.

Example commands:

```bash
npm run test:integration
```

## 3. Electron Tests

Test app startup and IPC.

Recommended tools:

```txt
Playwright
Electron test runner
```

Test cases:

- app launches
- renderer loads
- IPC APIs respond
- project picker can be mocked
- terminal session can be created
- app closes without zombie processes

## 4. Manual QA

Some terminal behavior must be manually tested.

Manual test matrix:

| Scenario | Expected Result |
|---|---|
| Open PowerShell terminal | Terminal accepts input |
| Run `node -v` | Output appears |
| Kill terminal process | Process stops |
| Open project with package.json | Scripts are detected |
| Open non-git folder | App shows safe message |
| Run quality command | Output is captured |
| Launch custom command | Terminal starts in project folder |
| Close app with running terminal | User is asked before closing |

## 5. Agent Integration Tests

These are manual or semi-automated because external CLI tools require login and provider configuration.

Test each agent profile:

### Codex

- profile launches
- terminal is interactive
- prompt can be pasted
- logs are captured
- process can be killed

### OpenCode

- interactive mode launches
- one-shot mode works if installed
- output is captured
- exit code is captured

### Kiro CLI

- profile launches
- working directory is correct
- headless mode can be configured if available

### Devin CLI

- profile launches
- user login state is respected
- session output is visible

### Custom Command

- user can define command
- command runs in selected project
- output is saved

## 6. Quality Gate Tests

Test with fake projects.

### Passing Project

Create a small sample project where:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

all pass.

Expected:

- all checks show pass
- output saved
- task can move to needs_review or done

### Failing Project

Create a sample project with broken TypeScript.

Expected:

- typecheck fails
- output is saved
- fix task can be created
- failed status is shown

## 7. Security Tests

Test:

- renderer cannot access Node.js directly
- IPC validates paths
- commands are shown before launch
- destructive git actions ask for confirmation
- logs redact common secret patterns
- app does not write outside allowed project folder without confirmation

## 8. Regression Tests

Before each release, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then manually test:

- open project
- create task
- launch terminal
- run command
- view log
- run quality check
- view git diff

## 9. Definition of Done for Any Feature

A feature is done when:

- it satisfies acceptance criteria
- it has unit tests where practical
- it handles error states
- it does not expose unsafe IPC
- it works on Windows
- it does not break existing workflows
- docs are updated if behavior changed
