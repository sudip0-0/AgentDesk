import { ipcMain } from "electron";
import { getAgentRunDetail, listAgentRuns } from "./runDetailRepository.js";
import { listReviews, saveReviewForRun } from "../db/repositories/reviewRepository.js";
import { parseRunPayload, runDetailSchema, runProjectSchema } from "./runDetailValidation.js";

export const registerRunDetailIpc = (): void => {
  ipcMain.handle("runs:list", (_event, payload: unknown) => {
    const parsed = parseRunPayload(runProjectSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return listAgentRuns(parsed.data.projectId);
  });

  ipcMain.handle("runs:get-detail", (_event, payload: unknown) => {
    const parsed = parseRunPayload(runDetailSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return getAgentRunDetail(parsed.data.projectId, parsed.data.runId);
  });

  ipcMain.handle("runs:save-review", (_event, payload: unknown) => {
    const parsed = parseRunPayload(runDetailSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return saveReviewForRun({ projectId: parsed.data.projectId, runId: parsed.data.runId });
  });

  ipcMain.handle("runs:list-reviews", (_event, payload: unknown) => {
    const parsed = parseRunPayload(runDetailSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return listReviews({ projectId: parsed.data.projectId, runId: parsed.data.runId });
  });
};
