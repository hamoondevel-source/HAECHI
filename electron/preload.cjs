const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("haechiDesktop", {
  isDesktop: true,
  getMapLibrary: () => ipcRenderer.invoke("desktop:get-map-library"),
  createMapProject: (payload) => ipcRenderer.invoke("desktop:create-map-project", payload),
  openStudioWindow: (payload) => ipcRenderer.invoke("desktop:open-studio-window", payload),
  readMapProject: (projectId) => ipcRenderer.invoke("desktop:read-map-project", projectId),
  saveMapProject: (payload) => ipcRenderer.invoke("desktop:save-map-project", payload),
  pickMapImage: (payload) => ipcRenderer.invoke("desktop:pick-map-image", payload),
  renameDomain: (payload) => ipcRenderer.invoke("desktop:rename-domain", payload),
  renameMapProject: (payload) => ipcRenderer.invoke("desktop:rename-map-project", payload),
  deleteMapProject: (projectId) => ipcRenderer.invoke("desktop:delete-map-project", projectId),
  renameProjectSpot: (payload) => ipcRenderer.invoke("desktop:rename-project-spot", payload),
  deleteProjectSpot: (payload) => ipcRenderer.invoke("desktop:delete-project-spot", payload),
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
