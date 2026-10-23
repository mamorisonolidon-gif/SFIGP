const { contextBridge, ipcRenderer } = require("electron");

// Expose des APIs sécurisées au renderer (React)
contextBridge.exposeInMainWorld("electronAPI", {
  // Contrôles fenêtre
  minimize:    () => ipcRenderer.invoke("window:minimize"),
  maximize:    () => ipcRenderer.invoke("window:maximize"),
  close:       () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),

  // Info app
  getVersion:  () => ipcRenderer.invoke("app:version"),

  // Détection : sommes-nous dans Electron ?
  isElectron: true,
});
