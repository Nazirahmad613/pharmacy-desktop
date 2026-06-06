const { contextBridge, ipcRenderer } = require('electron');
console.log("PRELOAD LOADED");
contextBridge.exposeInMainWorld('electronAPI', {
    
    createBackup: () => ipcRenderer.invoke('create-backup')
});