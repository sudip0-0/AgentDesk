import { app, BrowserWindow, dialog, shell } from "electron";
import { join } from "node:path";
import { initializeDatabase, shutdownDatabase } from "./db/initDatabase.js";
import { registerAgentProfileIpc } from "./agents/agentProfileIpc.js";
import { registerDatabaseIpc } from "./ipc/dbIpc.js";
import { registerRunLogIpc } from "./ipc/runLogIpc.js";
import { registerProjectIpc } from "./projects/projectIpc.js";
import { registerQualityIpc } from "./quality/qualityIpc.js";
import { registerTaskIpc } from "./tasks/taskIpc.js";
import { registerTerminalIpc, terminalSessionManager } from "./terminal/terminalIpc.js";
import { registerGitIpc } from "./git/gitIpc.js";

let isQuitting = false;

const confirmQuitWithActiveTerminals = (window: BrowserWindow): boolean => {
  const choice = dialog.showMessageBoxSync(window, {
    type: "warning",
    buttons: ["Cancel", "Close Anyway"],
    defaultId: 0,
    cancelId: 0,
    title: "Close AgentDesk",
    message: "Terminal sessions are still running",
    detail: "Closing will stop all active terminal processes."
  });

  return choice === 1;
};

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: "AgentDesk",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (isQuitting || !terminalSessionManager.hasActiveSessions()) {
      return;
    }

    event.preventDefault();
    if (confirmQuitWithActiveTerminals(mainWindow)) {
      isQuitting = true;
      terminalSessionManager.killAll();
      mainWindow.close();
    }
  });

  mainWindow.webContents.on("destroyed", () => {
    terminalSessionManager.killForWebContents(mainWindow.webContents.id);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
};

app.whenReady().then(() => {
  initializeDatabase();
  registerDatabaseIpc();
  registerAgentProfileIpc();
  registerProjectIpc();
  registerGitIpc();
  registerQualityIpc();
  registerTaskIpc();
  registerRunLogIpc();
  registerTerminalIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("before-quit", (event) => {
  if (isQuitting || !terminalSessionManager.hasActiveSessions()) {
    shutdownDatabase();
    return;
  }

  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  if (!window) {
    terminalSessionManager.killAll();
    shutdownDatabase();
    return;
  }

  event.preventDefault();

  if (confirmQuitWithActiveTerminals(window)) {
    isQuitting = true;
    terminalSessionManager.killAll();
    shutdownDatabase();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
