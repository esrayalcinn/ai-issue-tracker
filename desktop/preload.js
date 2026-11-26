const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPet", {
  setIgnoreMouse: (ignore) => ipcRenderer.send("pet:set-ignore-mouse", Boolean(ignore)),
  moveBy: (dx, dy) => ipcRenderer.send("pet:move-by", dx, dy),
  hide: () => ipcRenderer.send("pet:hide"),
  openBoard: () => ipcRenderer.send("pet:open-board"),
});
