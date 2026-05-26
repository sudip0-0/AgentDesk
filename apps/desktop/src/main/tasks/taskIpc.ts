import { ipcMain } from "electron";
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskStatus,
  updateTask
} from "../db/repositories/taskRepository.js";
import {
  parseTaskPayload,
  projectTaskListSchema,
  taskDeleteSchema,
  taskInputSchema,
  taskStatusUpdateSchema,
  taskUpdateSchema
} from "./taskValidation.js";

export const registerTaskIpc = (): void => {
  ipcMain.handle("task:list", (_event, payload: unknown) => {
    const parsed = parseTaskPayload(projectTaskListSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return listTasks(parsed.data.projectId);
  });

  ipcMain.handle("task:create", (_event, payload: unknown) => {
    const parsed = parseTaskPayload(taskInputSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return createTask(parsed.data);
  });

  ipcMain.handle("task:update", (_event, payload: unknown) => {
    const parsed = parseTaskPayload(taskUpdateSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return updateTask(parsed.data);
  });

  ipcMain.handle("task:set-status", (_event, payload: unknown) => {
    const parsed = parseTaskPayload(taskStatusUpdateSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return setTaskStatus(parsed.data);
  });

  ipcMain.handle("task:delete", (_event, payload: unknown) => {
    const parsed = parseTaskPayload(taskDeleteSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    deleteTask(parsed.data.id);
  });
};
