import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const app = window.agentdesk ? (
  <App />
) : (
  <main className="fallback-screen">
    <h1>AgentDesk must be opened from the desktop app.</h1>
    <p>Start it with <code>npm run dev</code> so Electron can load the secure preload API.</p>
  </main>
);

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      {app}
    </ErrorBoundary>
  </StrictMode>
);
