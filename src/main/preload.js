const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  setApiKey: (k) => ipcRenderer.invoke('set-api-key', k),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  seedSearch: (q, m) => ipcRenderer.invoke('seed-search', q, m),
  getTopShorts: (lim) => ipcRenderer.invoke('get-top-shorts', lim),
  getVideoMetrics: (id) => ipcRenderer.invoke('get-video-metrics', id),
  exportCSV: (kind) => ipcRenderer.invoke('export-csv', kind)
});
