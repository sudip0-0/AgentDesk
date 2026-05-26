import { ipcMain } from "electron";
import {
  createFixTaskFromQualityCheck,
  createQualityCommand,
  deleteQualityCommand,
  listQualityChecks,
  listQualityCommands,
  updateQualityCommand
} from "../db/repositories/qualityRepository.js";
import { runQualityChecks } from "./qualityRunner.js";
import {
  createFixTaskSchema,
  listQualityChecksSchema,
  parseQualityPayload,
  projectQualitySchema,
  qualityCommandDeleteSchema,
  qualityCommandInputSchema,
  qualityCommandUpdateSchema,
  runQualityChecksSchema
} from "./qualityValidation.js";

export const registerQualityIpc = (): void => {
  ipcMain.handle("quality:list-commands", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(projectQualitySchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return listQualityCommands(parsed.data.projectId);
  });

  ipcMain.handle("quality:create-command", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(qualityCommandInputSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return createQualityCommand(parsed.data);
  });

  ipcMain.handle("quality:update-command", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(qualityCommandUpdateSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return updateQualityCommand(parsed.data);
  });

  ipcMain.handle("quality:delete-command", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(qualityCommandDeleteSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    deleteQualityCommand(parsed.data.projectId, parsed.data.id);
  });

  ipcMain.handle("quality:run", async (_event, payload: unknown) => {
    const parsed = parseQualityPayload(runQualityChecksSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return runQualityChecks(parsed.data);
  });

  ipcMain.handle("quality:list-checks", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(listQualityChecksSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return listQualityChecks(parsed.data);
  });

  ipcMain.handle("quality:create-fix-task", (_event, payload: unknown) => {
    const parsed = parseQualityPayload(createFixTaskSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return createFixTaskFromQualityCheck(parsed.data);
  });
};
