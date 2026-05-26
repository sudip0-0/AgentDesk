import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const electronTarget = rootPackage.devDependencies?.electron;

if (!electronTarget) {
  console.error("Electron devDependency is missing from package.json.");
  process.exit(1);
}

const electronPackagePath = join(root, "node_modules", "electron", "package.json");

if (!existsSync(electronPackagePath)) {
  console.error("Electron is not installed. Run npm install first.");
  process.exit(1);
}

const installedElectronVersion = JSON.parse(readFileSync(electronPackagePath, "utf8")).version;

const run = (command, cwd = root) => {
  execSync(command, { cwd, stdio: "inherit", shell: true });
};

if (installedElectronVersion !== electronTarget) {
  console.warn(
    `Installed Electron is ${installedElectronVersion}, but package.json pins ${electronTarget}.`
  );
  console.warn("Close AgentDesk and run npm install so native modules match the pinned Electron version.");
}

console.log(`Installing better-sqlite3 prebuild for Electron ${electronTarget}...`);

try {
  run(
    `npx prebuild-install -r electron -t ${electronTarget}`,
    join(root, "node_modules", "better-sqlite3")
  );
} catch {
  console.error(
    `No prebuilt better-sqlite3 binary is available for Electron ${electronTarget} on this platform.`
  );
  process.exit(1);
}

console.log(`Rebuilding node-pty for Electron ${installedElectronVersion}...`);

try {
  run(`npx electron-rebuild -f -w node-pty --version ${installedElectronVersion}`, root);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`node-pty rebuild failed: ${message}`);
  console.warn("Terminal support may be unavailable until node-pty rebuild succeeds.");
}

console.log("Native module rebuild finished.");
