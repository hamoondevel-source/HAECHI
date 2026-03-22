import { app, BrowserWindow, dialog, ipcMain, nativeImage } from "electron";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const isDev = !app.isPackaged;
const rendererUrl = "http://localhost:5173";
const studioWindows = new Map();

function resolveImageMimeType(fileName) {
  const extension = path.extname(String(fileName || "")).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "image/png";
}

async function pickImageFile(window) {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "svg"] }]
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const buffer = await fs.readFile(sourcePath);
  const imageSize = nativeImage.createFromPath(sourcePath).getSize();
  const mimeType = resolveImageMimeType(fileName);

  return {
    fileName,
    width: imageSize.width > 0 ? imageSize.width : 1600,
    height: imageSize.height > 0 ? imageSize.height : 900,
    mimeType,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`
  };
}

function getRendererTarget(search = "") {
  if (isDev) {
    return `${rendererUrl}/${search}`;
  }

  const indexPath = path.join(repoRoot, "frontend", "dist", "index.html");
  return `${pathToFileURL(indexPath).href}${search}`;
}

function attachWindowChromeState(window) {
  function emitState() {
    if (!window.isDestroyed()) {
      window.webContents.send("desktop:window-maximized-changed", window.isMaximized());
    }
  }

  window.on("maximize", emitState);
  window.on("unmaximize", emitState);
  window.on("enter-full-screen", emitState);
  window.on("leave-full-screen", emitState);
  window.webContents.on("did-finish-load", emitState);
}

function attachDevToolsShortcut(window) {
  if (app.isPackaged) {
    return;
  }

  window.webContents.on("before-input-event", (event, input) => {
    const isToggleCombo =
      input.type === "keyDown" &&
      (input.key === "F12" ||
        ((input.control || input.meta) && input.shift && String(input.key).toUpperCase() === "I"));

    if (!isToggleCombo) {
      return;
    }

    event.preventDefault();

    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
    } else {
      window.webContents.openDevTools({ mode: "detach" });
    }
  });
}

function createDesktopWindow(options = {}) {
  const window = new BrowserWindow({
    backgroundColor: "#17181b",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
    ...options
  });

  window.removeMenu();
  attachWindowChromeState(window);
  attachDevToolsShortcut(window);
  return window;
}

async function createMainWindow() {
  const window = createDesktopWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800
  });

  await window.loadURL(getRendererTarget("?desktop=1"));
  return window;
}

async function createStudioWindow(request) {
  const payload =
    typeof request === "string"
      ? { deckId: request, focusType: "deck", focusId: "", actorId: "" }
      : {
          deckId: request?.deckId ?? "",
          focusType: request?.focusType ?? "deck",
          focusId: request?.focusId ?? "",
          actorId: request?.actorId ?? ""
        };
  const windowKey = `${payload.deckId}:${payload.focusType}:${payload.focusId}`;
  const existingWindow = studioWindows.get(windowKey);

  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return existingWindow;
  }

  const window = createDesktopWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    skipTaskbar: false
  });

  studioWindows.set(windowKey, window);
  window.on("closed", () => {
    studioWindows.delete(windowKey);
  });

  const query = new URLSearchParams({
    desktop: "1",
    view: "studio",
    deckId: payload.deckId
  });

  if (payload.focusType) {
    query.set("focusType", payload.focusType);
  }

  if (payload.focusId) {
    query.set("focusId", payload.focusId);
  }

  if (payload.actorId) {
    query.set("actorId", payload.actorId);
  }

  await window.loadURL(getRendererTarget(`?${query.toString()}`));
  return window;
}

ipcMain.handle("desktop:open-studio-window", async (_event, payload) => {
  await createStudioWindow(payload);
  return { ok: true };
});

ipcMain.handle("desktop:pick-image-file", async (event) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  return pickImageFile(ownerWindow ?? undefined);
});

ipcMain.handle("desktop:window-minimize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.minimize();
  return { ok: true };
});

ipcMain.handle("desktop:window-toggle-maximize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) {
    return { ok: false, isMaximized: false };
  }

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }

  return { ok: true, isMaximized: window.isMaximized() };
});

ipcMain.handle("desktop:window-is-maximized", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return { ok: Boolean(window), isMaximized: window?.isMaximized?.() ?? false };
});

ipcMain.handle("desktop:window-close", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.close();
  return { ok: true };
});

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
