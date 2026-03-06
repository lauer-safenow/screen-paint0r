import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { createOverlayWindow, setDrawMode } from './overlay-window';
import { createTray } from './tray';
import { createDockIcon } from './create-icon';
import { IPC_CHANNELS, SHORTCUTS } from '../shared/constants';
import fs from 'node:fs';
import path from 'node:path';

app.setName('Screen Paint0r');

const LOG_FILE = path.join(app.getPath('userData'), 'screen-paint0r.log');

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT: ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

let overlayWindow: BrowserWindow | null = null;
let drawModeActive = false;
let laserModeActive = false;

function toggleDrawMode() {
  if (laserModeActive) {
    laserModeActive = false;
    overlayWindow?.webContents.send(IPC_CHANNELS.LASER_MODE_CHANGED, false);
  }
  drawModeActive = !drawModeActive;
  log(`Draw mode: ${drawModeActive}`);
  if (overlayWindow) {
    setDrawMode(overlayWindow, drawModeActive);
    overlayWindow.webContents.send(IPC_CHANNELS.DRAW_MODE_CHANGED, drawModeActive);
  }
}

function toggleLaserMode() {
  if (drawModeActive) {
    drawModeActive = false;
    overlayWindow?.webContents.send(IPC_CHANNELS.DRAW_MODE_CHANGED, false);
  }
  laserModeActive = !laserModeActive;
  log(`Laser mode: ${laserModeActive}`);
  if (overlayWindow) {
    setDrawMode(overlayWindow, laserModeActive);
    overlayWindow.webContents.send(IPC_CHANNELS.LASER_MODE_CHANGED, laserModeActive);
  }
}

function clearAll() {
  if (overlayWindow) {
    overlayWindow.webContents.send(IPC_CHANNELS.CLEAR_ALL);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (overlayWindow) {
      toggleDrawMode();
    }
  });

  app.whenReady().then(() => {
    try {
      log('App ready');

      // Show in dock with custom icon
      if (process.platform === 'darwin' && app.dock) {
        try {
          app.dock.setIcon(createDockIcon());
          // Force dock icon to stay visible
          app.dock.show();
          log('Dock icon set');
        } catch (e) {
          log(`Dock icon error: ${e}`);
        }
      }

      log('Creating overlay window...');
      overlayWindow = createOverlayWindow();
      log('Overlay window created');

      overlayWindow.on('closed', () => {
        overlayWindow = null;
      });

      log(`Registering shortcuts: ${SHORTCUTS.TOGGLE_DRAW}, ${SHORTCUTS.CLEAR_ALL}, ${SHORTCUTS.TOGGLE_LASER}`);
      const drawReg = globalShortcut.register(SHORTCUTS.TOGGLE_DRAW, toggleDrawMode);
      const clearReg = globalShortcut.register(SHORTCUTS.CLEAR_ALL, clearAll);
      const laserReg = globalShortcut.register(SHORTCUTS.TOGGLE_LASER, toggleLaserMode);
      log(`Shortcut registration - draw: ${drawReg}, clear: ${clearReg}, laser: ${laserReg}`);

      log('Creating tray...');
      createTray(() => toggleDrawMode(), () => clearAll(), () => toggleLaserMode());
      log('Tray created. App fully initialized.');

      ipcMain.on(IPC_CHANNELS.TOGGLE_LASER, () => {
        toggleLaserMode();
      });

      ipcMain.on(IPC_CHANNELS.TOGGLE_DRAW, () => {
        toggleDrawMode();
      });

      ipcMain.on(IPC_CHANNELS.ESCAPE_PRESSED, () => {
        if (drawModeActive) {
          drawModeActive = false;
          if (overlayWindow) {
            setDrawMode(overlayWindow, false);
            overlayWindow.webContents.send(IPC_CHANNELS.DRAW_MODE_CHANGED, false);
          }
        }
        if (laserModeActive) {
          laserModeActive = false;
          if (overlayWindow) {
            setDrawMode(overlayWindow, false);
            overlayWindow.webContents.send(IPC_CHANNELS.LASER_MODE_CHANGED, false);
          }
        }
      });
    } catch (err) {
      log(`STARTUP ERROR: ${err instanceof Error ? err.stack : err}`);
    }
  });

  app.on('before-quit', () => {
    log('Quitting');
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    // Keep running in tray
  });
}
