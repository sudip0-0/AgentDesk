import type { PackageManager, ProjectMetadata } from "./projectTypes.js";

export interface DefaultQualityCommand {
  label: string;
  command: string;
  required: boolean;
  timeoutMs: number;
}

const scriptRunCommand = (packageManager: PackageManager, scriptName: string): string => {
  switch (packageManager) {
    case "pnpm":
      return `pnpm run ${scriptName}`;
    case "yarn":
      return `yarn run ${scriptName}`;
    case "bun":
      return `bun run ${scriptName}`;
    case "npm":
      return `npm run ${scriptName}`;
    default:
      return `npm run ${scriptName}`;
  }
};

const qualityScriptCandidates: Array<{
  label: string;
  scriptNames: string[];
  required: boolean;
  timeoutMs: number;
}> = [
  { label: "Lint", scriptNames: ["lint"], required: true, timeoutMs: 120_000 },
  { label: "Typecheck", scriptNames: ["typecheck", "type-check"], required: true, timeoutMs: 120_000 },
  { label: "Test", scriptNames: ["test"], required: true, timeoutMs: 120_000 },
  { label: "Build", scriptNames: ["build"], required: true, timeoutMs: 180_000 }
];

/** Builds default quality commands from detected package.json scripts. */
export const buildDefaultQualityCommandsFromMetadata = (
  metadata: ProjectMetadata
): DefaultQualityCommand[] => {
  if (!metadata.hasPackageJson) {
    return [];
  }

  const availableScripts = new Map(metadata.scripts.map((script) => [script.name, script.name]));
  const defaults: DefaultQualityCommand[] = [];

  for (const candidate of qualityScriptCandidates) {
    const scriptName = candidate.scriptNames.find((name) => availableScripts.has(name));

    if (!scriptName) {
      continue;
    }

    defaults.push({
      label: candidate.label,
      command: scriptRunCommand(metadata.packageManager, scriptName),
      required: candidate.required,
      timeoutMs: candidate.timeoutMs
    });
  }

  return defaults;
};
