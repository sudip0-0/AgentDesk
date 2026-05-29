import { ipcMain } from "electron";
import { z } from "zod";
import {
  IDLE_WARNING_SECONDS_MAX,
  IDLE_WARNING_SECONDS_MIN
} from "../../shared/settingsTypes.js";
import { getAppSettings, updateAppSettings } from "../db/repositories/settingsRepository.js";

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

export const registerSettingsIpc = (): void => {
  ipcMain.handle("settings:get", () => getAppSettings());

  ipcMain.handle("settings:update", (_event, payload: unknown) => {
    const result = settingsUpdateSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid settings update.");
    }

    return updateAppSettings(result.data);
  });
};
