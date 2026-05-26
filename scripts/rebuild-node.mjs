import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const env = { ...process.env };

delete env.npm_config_runtime;
delete env.npm_config_target;
delete env.npm_config_disturl;
delete env.npm_config_build_from_source;

console.log("Rebuilding better-sqlite3 for system Node (Vitest)...");

execSync("npm rebuild better-sqlite3", { cwd: root, stdio: "inherit", env, shell: true });
