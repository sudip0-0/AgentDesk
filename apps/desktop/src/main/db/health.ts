import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "./client.js";
import { projects } from "./schema.js";
import { DEFAULT_PROJECT_ID } from "./constants.js";
import { ensureDefaultProject } from "./seed.js";

export interface DatabaseHealth {
  ok: boolean;
  path: string;
  projectCount: number;
  message: string;
}

export const checkDatabaseHealth = (databasePath: string): DatabaseHealth => {
  try {
    ensureDefaultProject();
    const database = getDatabase();
    const projectCount = database.select().from(projects).all().length;

    const probeId = `probe-${randomUUID()}`;
    const now = new Date().toISOString();

    database.insert(projects).values({
      id: probeId,
      name: "Database Probe",
      path: `probe://${probeId}`,
      createdAt: now,
      updatedAt: now
    }).run();

    const probe = database.select().from(projects).where(eq(projects.id, probeId)).get();
    database.delete(projects).where(eq(projects.id, probeId)).run();

    if (!probe) {
      return {
        ok: false,
        path: databasePath,
        projectCount,
        message: "Database probe read failed."
      };
    }

    const defaultProject = database
      .select()
      .from(projects)
      .where(eq(projects.id, DEFAULT_PROJECT_ID))
      .get();

    if (!defaultProject) {
      return {
        ok: false,
        path: databasePath,
        projectCount,
        message: "Default project is missing."
      };
    }

    return {
      ok: true,
      path: databasePath,
      projectCount,
      message: "Database is ready."
    };
  } catch (error) {
    return {
      ok: false,
      path: databasePath,
      projectCount: 0,
      message: error instanceof Error ? error.message : "Database health check failed."
    };
  }
};
