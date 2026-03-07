import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('prefsApi', {
  getKeybindings: (): Promise<Record<string, string>> => ipcRenderer.invoke('get-keybindings'),
  saveKeybindings: (keybindings: Record<string, string>): Promise<void> => ipcRenderer.invoke('save-keybindings', keybindings),
  resetKeybindings: (): Promise<Record<string, string>> => ipcRenderer.invoke('reset-keybindings'),
});
