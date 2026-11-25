'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('counter', {
  getState: () => ipcRenderer.invoke('get-state'),
  save: value => ipcRenderer.invoke('save-state', value),
  increment: () => ipcRenderer.invoke('increment'),
  openDisplay: () => ipcRenderer.invoke('open-display'),
  onState: callback => { ipcRenderer.on('state', (_event, state) => callback(state)); }
});
