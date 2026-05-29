import { ipcMain } from "electron";
import { z } from "zod";
import {
  IDLE_WARNING_SECONDS_MAX,
  IDLE_WARNING_SECONDS_MIN,
  UI_SCREEN_IDS
} from "../../shared/settingsTypes.js";
import {
  getAppSettings,
  getUiPreferences,
  updateAppSettings,
  updateUiPreferences
} from "../db/repositories/settingsRepository.js";

const settingsUpdateSchema = z
  .object({
    blockDestructiveCommands: z.boolean().optional(),
    requireAgentLaunchApproval: z.boolean().optional(),
    confirmDestructiveGit: z.boolean().optional(),
    idleWarningSeconds: z
      .number()
      .int()
      .min(IDLE_WARNING_SECONDS_MIN)
      .max(IDLE_WARNING_SECONDS_MAX)
      .optional()
  })
  .strict();

const uiPreferencesUpdateSchema = z
  .object({
    sidebarCollapsed: z.boolean().optional(),
    lastActiveScreen: z.enum(UI_SCREEN_IDS).optional(),
    projectSelections: z
      .record(
        z.string(),
        z
          .object({
            taskId: z.string().optional(),
            runId: z.string().optional()
          })
          .strict()
      )
      .optional()
  })
  .strict();

export const registerSettingsIpc = (): void => {
  ipcMain.handle("settings:get", () => getAppSettings());

  ipcMain.handle("settings:update", (_event, payload: unknown) => {
    const result = settingsUpdateSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid settings update.");
    }

    return updateAppSettings(result.data);
  });

  ipcMain.handle("settings:get-ui", () => getUiPreferences());

  ipcMain.handle("settings:update-ui", (_event, payload: unknown) => {
    const result = uiPreferencesUpdateSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid UI preferences update.");
    }

    return updateUiPreferences(result.data);
  });
};
