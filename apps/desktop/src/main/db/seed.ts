import { eq } from "drizzle-orm";
import { homedir } from "node:os";
import { DEFAULT_PROJECT_ID } from "./constants.js";
import { getDatabase } from "./client.js";
import { projects } from "./schema.js";

export const ensureDefaultProject = (): void => {
  const database = getDatabase();
  const existing = database
    .select()
    .from(projects)
    .where(eq(projects.id, DEFAULT_PROJECT_ID))
    .get();

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  const homePath = homedir();

  database.insert(projects).values({
    id: DEFAULT_PROJECT_ID,
    name: "Local Workspace",
    path: homePath,
    createdAt: now,
    updatedAt: now
  }).run();
};
