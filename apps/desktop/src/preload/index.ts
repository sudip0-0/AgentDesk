import { contextBridge } from "electron";

const agentdeskApi = {
  app: {
    getName: (): string => "AgentDesk",
    getPhase: (): string => "Desktop App Foundation"
  }
};

contextBridge.exposeInMainWorld("agentdesk", agentdeskApi);

export type AgentDeskApi = typeof agentdeskApi;
