import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('screenPaintApi', {
  onDrawModeChanged: (callback: (active: boolean) => void) => {
    ipcRenderer.on(IPC_CHANNELS.DRAW_MODE_CHANGED, (_event, active: boolean) => callback(active));
  },
  onClearAll: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.CLEAR_ALL, () => callback());
  },
  onLaserModeChanged: (callback: (active: boolean) => void) => {
    ipcRenderer.on(IPC_CHANNELS.LASER_MODE_CHANGED, (_event, active: boolean) => callback(active));
  },
  onKeybindings: (callback: (keybindings: Record<string, string>) => void) => {
    ipcRenderer.on(IPC_CHANNELS.KEYBINDINGS, (_event, keybindings) => callback(keybindings));
  },
  sendEscapePressed: () => {
    ipcRenderer.send(IPC_CHANNELS.ESCAPE_PRESSED);
  },
  sendQuitApp: () => {
    ipcRenderer.send(IPC_CHANNELS.QUIT_APP);
  },
  sendToggleLaser: () => {
    ipcRenderer.send(IPC_CHANNELS.TOGGLE_LASER);
  },
  sendToggleDraw: () => {
    ipcRenderer.send(IPC_CHANNELS.TOGGLE_DRAW);
  },
  sendColorPickerOpened: () => {
    ipcRenderer.send(IPC_CHANNELS.COLOR_PICKER_OPENED);
  },
  sendColorPickerClosed: () => {
    ipcRenderer.send(IPC_CHANNELS.COLOR_PICKER_CLOSED);
  },
  sendScreenshotToClipboard: () => {
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_TO_CLIPBOARD);
  },
  onHideToolbarForScreenshot: (callback: () => void) => {
    ipcRenderer.on('hide-toolbar-for-screenshot', () => callback());
  },
  onShowToolbarAfterScreenshot: (callback: () => void) => {
    ipcRenderer.on('show-toolbar-after-screenshot', () => callback());
  },
});
