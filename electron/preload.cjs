const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("haechiDesktop", {
  isDesktop: true,
  openStudioWindow: (payload) => ipcRenderer.invoke("desktop:open-studio-window", payload),
  pickImageFile: () => ipcRenderer.invoke("desktop:pick-image-file"),
  minimizeWindow: () => ipcRenderer.invoke("desktop:window-minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("desktop:window-toggle-maximize"),
  isWindowMaximized: () => ipcRenderer.invoke("desktop:window-is-maximized"),
  closeWindow: () => ipcRenderer.invoke("desktop:window-close"),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event, isMaximized) => callback?.(isMaximized);
    ipcRenderer.on("desktop:window-maximized-changed", listener);
    return () => ipcRenderer.removeListener("desktop:window-maximized-changed", listener);
  }
});
