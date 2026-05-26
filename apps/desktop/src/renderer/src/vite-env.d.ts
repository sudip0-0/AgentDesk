/// <reference types="vite/client" />

import type { AgentDeskApi } from "../../../shared/agentdeskApi";

declare global {
  interface Window {
    agentdesk: AgentDeskApi;
  }
}
