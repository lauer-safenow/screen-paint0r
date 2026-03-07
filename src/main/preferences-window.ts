import { BrowserWindow } from 'electron';
import path from 'node:path';

let prefsWindow: BrowserWindow | null = null;

export function openPreferences() {
  if (prefsWindow) {
    prefsWindow.focus();
    return;
  }

  prefsWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: 'Screen Paint0r — Preferences',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preferences-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  prefsWindow.setAlwaysOnTop(true, 'screen-saver');
  prefsWindow.loadFile(path.join(__dirname, 'preferences.html'));
  prefsWindow.focus();

  prefsWindow.on('closed', () => {
    prefsWindow = null;
  });
}
