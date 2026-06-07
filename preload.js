const { contextBridge, ipcRenderer } = require('electron');

console.log("PRELOAD: Script started");

// منتظر بمان تا context isolation آماده شود
setTimeout(() => {
    console.log("PRELOAD: Exposing API...");
    contextBridge.exposeInMainWorld('electronAPI', {
        createBackup: async () => {
            console.log("PRELOAD: createBackup called");
            try {
                const result = await ipcRenderer.invoke('create-backup');
                console.log("PRELOAD: createBackup result:", result);
                return result;
            } catch (error) {
                console.error("PRELOAD: createBackup error:", error);
                throw error;
            }
        },
        // اضافه شدن متد restoreBackup برای بازیابی بکاپ
        restoreBackup: async () => {
            console.log("PRELOAD: restoreBackup called");
            try {
                const result = await ipcRenderer.invoke('restore-backup');
                console.log("PRELOAD: restoreBackup result:", result);
                return result;
            } catch (error) {
                console.error("PRELOAD: restoreBackup error:", error);
                throw error;
            }
        }
    });
    console.log("PRELOAD: API exposed successfully");
}, 0);

console.log("PRELOAD: Script ended");