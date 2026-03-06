import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('screenPaintApi', {
  onDrawModeChanged: (callback: (active: boolean) => void) => {
    ipcRenderer.on(IPC_CHANNELS.DRAW_MODE_CHANGED, (_event, active: boolean) => callback(active));
  },
  onClearAll: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.CLEAR_ALL, () => callback());
  },
  sendEscapePressed: () => {
    ipcRenderer.send(IPC_CHANNELS.ESCAPE_PRESSED);
  },
});
