const { contextBridge, ipcRenderer } = require('electron');

console.log("PRELOAD: Script started");

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
        },
        setBackupSchedule: async (scheduleConfig) => {
            console.log("PRELOAD: setBackupSchedule called", scheduleConfig);
            try {
                const result = await ipcRenderer.invoke('set-backup-schedule', scheduleConfig);
                console.log("PRELOAD: setBackupSchedule result:", result);
                return result;
            } catch (error) {
                console.error("PRELOAD: setBackupSchedule error:", error);
                throw error;
            }
        },
        getBackupSchedule: async () => {
            console.log("PRELOAD: getBackupSchedule called");
            try {
                const result = await ipcRenderer.invoke('get-backup-schedule');
                console.log("PRELOAD: getBackupSchedule result:", result);
                return result;
            } catch (error) {
                console.error("PRELOAD: getBackupSchedule error:", error);
                throw error;
            }
        }
    });
    console.log("PRELOAD: API exposed successfully");
}, 0);

console.log("PRELOAD: Script ended");