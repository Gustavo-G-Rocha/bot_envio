const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseAPI', {
    validate: (key) => ipcRenderer.invoke('license:validate', key),
});
