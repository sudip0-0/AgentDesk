import { ipcMain } from "electron";
import {
  previewDefaultDocuments,
  previewProgressDocument,
  writePreviewedDocuments
} from "./documentRepository.js";
import {
  documentProjectSchema,
  documentsWriteSchema,
  parseDocumentPayload
} from "./documentValidation.js";

export const registerDocumentIpc = (): void => {
  ipcMain.handle("documents:preview-defaults", (_event, payload: unknown) => {
    const parsed = parseDocumentPayload(documentProjectSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return previewDefaultDocuments(parsed.data.projectId);
  });

  ipcMain.handle("documents:preview-progress", (_event, payload: unknown) => {
    const parsed = parseDocumentPayload(documentProjectSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return previewProgressDocument(parsed.data.projectId);
  });

  ipcMain.handle("documents:write", (_event, payload: unknown) => {
    const parsed = parseDocumentPayload(documentsWriteSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return writePreviewedDocuments(parsed.data);
  });
};
