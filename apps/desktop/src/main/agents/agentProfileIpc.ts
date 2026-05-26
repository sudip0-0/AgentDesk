import { ipcMain } from "electron";
import {
  createAgentProfile,
  deleteAgentProfile,
  listAgentProfiles,
  updateAgentProfile
} from "../db/repositories/agentProfileRepository.js";
import {
  agentProfileDeleteSchema,
  agentProfileInputSchema,
  agentProfileUpdateSchema,
  parseAgentProfilePayload
} from "./agentProfileValidation.js";

export const registerAgentProfileIpc = (): void => {
  ipcMain.handle("agent-profile:list", () => listAgentProfiles());

  ipcMain.handle("agent-profile:create", (_event, payload: unknown) => {
    const parsed = parseAgentProfilePayload(agentProfileInputSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return createAgentProfile(parsed.data);
  });

  ipcMain.handle("agent-profile:update", (_event, payload: unknown) => {
    const parsed = parseAgentProfilePayload(agentProfileUpdateSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return updateAgentProfile(parsed.data);
  });

  ipcMain.handle("agent-profile:delete", (_event, payload: unknown) => {
    const parsed = parseAgentProfilePayload(agentProfileDeleteSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    deleteAgentProfile(parsed.data.id);
  });
};
