import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron';
import { createOverlayWindow, setDrawMode } from './overlay-window';
import { createTray } from './tray';
import { createDockIcon } from './create-icon';
import { openPreferences } from './preferences-window';
import { IPC_CHANNELS } from '../shared/constants';
import { Keybindings, DEFAULT_KEYBINDINGS, GLOBAL_SHORTCUT_KEYS } from '../shared/keybindings';
import fs from 'node:fs';
import path from 'node:path';

app.setName('Screen Paint0r');

const LOG_FILE = path.join(app.getPath('userData'), 'screen-paint0r.log');
const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const KEYBINDINGS_FILE = path.join(CONFIG_DIR, 'keybindings.json');

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

function isAscii(str: string): boolean {
  return /^[\x20-\x7E]+$/.test(str);
}

function sanitizeKeybindings(kb: Record<string, string>): Keybindings {
  const result = { ...DEFAULT_KEYBINDINGS };
  for (const key of Object.keys(DEFAULT_KEYBINDINGS) as (keyof Keybindings)[]) {
    if (kb[key] && typeof kb[key] === 'string' && isAscii(kb[key])) {
      result[key] = kb[key];
    } else if (kb[key]) {
      log(`Invalid keybinding for "${key}": "${kb[key]}" (non-ASCII), reset to default`);
    }
  }
  return result;
}

function loadKeybindings(): Keybindings {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (fs.existsSync(KEYBINDINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEYBINDINGS_FILE, 'utf-8'));
      const sanitized = sanitizeKeybindings(data);
      // Write back sanitized version in case we fixed anything
      fs.writeFileSync(KEYBINDINGS_FILE, JSON.stringify(sanitized, null, 2) + '\n');
      return sanitized;
    }
  } catch (e) {
    log(`Error loading keybindings: ${e}`);
  }
  try {
    fs.writeFileSync(KEYBINDINGS_FILE, JSON.stringify(DEFAULT_KEYBINDINGS, null, 2) + '\n');
    log(`Default keybindings written to ${KEYBINDINGS_FILE}`);
  } catch (e) {
    log(`Error writing default keybindings: ${e}`);
  }
  return { ...DEFAULT_KEYBINDINGS };
}

function saveKeybindings(kb: Keybindings) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(KEYBINDINGS_FILE, JSON.stringify(kb, null, 2) + '\n');
    log('Keybindings saved');
  } catch (e) {
    log(`Error saving keybindings: ${e}`);
  }
}

let overlayWindow: BrowserWindow | null = null;
let drawModeActive = false;
let laserModeActive = false;
let currentKeybindings: Keybindings;

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

const GLOBAL_ACTIONS: Record<string, () => void> = {
  toggleDraw: toggleDrawMode,
  togglePointer: toggleLaserMode,
  clearAll: clearAll,
};

function registerGlobalShortcuts(kb: Keybindings) {
  globalShortcut.unregisterAll();
  for (const key of GLOBAL_SHORTCUT_KEYS) {
    const accelerator = kb[key];
    const action = GLOBAL_ACTIONS[key];
    if (accelerator && action && isAscii(accelerator)) {
      const ok = globalShortcut.register(accelerator, action);
      log(`Registered ${key}: ${accelerator} → ${ok}`);
    }
  }
}

function applyKeybindings(kb: Keybindings) {
  currentKeybindings = kb;
  registerGlobalShortcuts(kb);
  // Send to overlay renderer
  overlayWindow?.webContents.send(IPC_CHANNELS.KEYBINDINGS, kb);
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

      if (process.platform === 'darwin' && app.dock) {
        try {
          app.dock.setIcon(createDockIcon());
          app.dock.show();
          const dockMenu = Menu.buildFromTemplate([
            { label: 'Preferences…', click: () => openPreferences() },
          ]);
          app.dock.setMenu(dockMenu);
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

      // Load and apply keybindings
      currentKeybindings = loadKeybindings();
      log(`Keybindings config: ${KEYBINDINGS_FILE}`);
      applyKeybindings(currentKeybindings);

      // App menu with Cmd+, for preferences
      const appMenu = Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { label: 'About Screen Paint0r', role: 'about' },
            { type: 'separator' },
            {
              label: 'Preferences…',
              accelerator: 'CmdOrCtrl+,',
              click: () => {
                log('Preferences clicked from app menu');
                openPreferences();
              },
            },
            { type: 'separator' },
            { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
          ],
        },
        {
          label: 'Settings',
          submenu: [
            {
              label: 'Preferences…',
              accelerator: 'CmdOrCtrl+,',
              click: () => openPreferences(),
            },
          ],
        },
      ]);
      Menu.setApplicationMenu(appMenu);

      // Send keybindings when renderer loads
      overlayWindow.webContents.on('did-finish-load', () => {
        overlayWindow?.webContents.send(IPC_CHANNELS.KEYBINDINGS, currentKeybindings);
      });

      log('Creating tray...');
      createTray(
        () => toggleDrawMode(),
        () => clearAll(),
        () => toggleLaserMode(),
        () => openPreferences(),
        currentKeybindings,
      );
      log('Tray created. App fully initialized.');

      // Preferences IPC handlers
      ipcMain.handle('get-keybindings', () => {
        return currentKeybindings;
      });

      ipcMain.handle('save-keybindings', (_event, kb: Keybindings) => {
        const sanitized = sanitizeKeybindings(kb);
        saveKeybindings(sanitized);
        applyKeybindings(sanitized);
        // Rebuild tray with new labels
        createTray(
          () => toggleDrawMode(),
          () => clearAll(),
          () => toggleLaserMode(),
          () => openPreferences(),
          kb,
        );
      });

      ipcMain.handle('reset-keybindings', () => {
        const defaults = { ...DEFAULT_KEYBINDINGS };
        saveKeybindings(defaults);
        applyKeybindings(defaults);
        createTray(
          () => toggleDrawMode(),
          () => clearAll(),
          () => toggleLaserMode(),
          () => openPreferences(),
          defaults,
        );
        return defaults;
      });

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
