import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { registerTerminalIpc, terminalSessionManager } from "./terminal/terminalIpc.js";

const createMainWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: "AgentDesk",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
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

  mainWindow.webContents.on("destroyed", () => {
    terminalSessionManager.killForWebContents(mainWindow.webContents.id);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
};

app.whenReady().then(() => {
  registerTerminalIpc();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  terminalSessionManager.killAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
