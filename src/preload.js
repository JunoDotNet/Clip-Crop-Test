const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectVideoFile: () => ipcRenderer.invoke('select-video-file')
});
