import { app, BrowserWindow, globalShortcut, ipcMain, Menu, dialog, clipboard, nativeImage, desktopCapturer, screen } from 'electron';
import { createOverlayWindow, setDrawMode, setLaserMode } from './overlay-window';
import { createTray } from './tray';
import { createDockIcon } from './create-icon';
import { openPreferences } from './preferences-window';
import { IPC_CHANNELS } from '../shared/constants';
import { Keybindings, DEFAULT_KEYBINDINGS, GLOBAL_SHORTCUT_KEYS } from '../shared/keybindings';
import { ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;

const isDev = !app.isPackaged;
app.setName(isDev ? 'Screen Paint0r (DEV)' : 'Screen Paint0r');

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
let trayRef: Electron.Tray | null = null; // prevent GC
let drawModeActive = false;
let laserModeActive = false;
let currentKeybindings: Keybindings;
let clickMonitorProc: ChildProcess | null = null;

function startClickMonitor() {
  if (clickMonitorProc) return;
  const binPath = path.join(__dirname, 'click-monitor');
  if (!fs.existsSync(binPath)) {
    log('click-monitor binary not found, pointer ping disabled');
    return;
  }
  try {
    clickMonitorProc = spawn(binPath, [], { stdio: ['ignore', 'pipe', 'ignore'] });
    const rl = createInterface({ input: clickMonitorProc.stdout! });
    rl.on('line', (line) => {
      if (!laserModeActive || !overlayWindow) return;
      const parts = line.split(',');
      if (parts.length !== 2) return;
      const sx = parseFloat(parts[0]);
      const sy = parseFloat(parts[1]);
      if (isNaN(sx) || isNaN(sy)) return;
      const bounds = overlayWindow.getBounds();
      overlayWindow.webContents.send(IPC_CHANNELS.LASER_CLICK, sx - bounds.x, sy - bounds.y);
    });
    clickMonitorProc.on('exit', () => { clickMonitorProc = null; });
    log('click-monitor started');
  } catch (e) {
    log(`Failed to start click-monitor: ${e}`);
    clickMonitorProc = null;
  }
}

function stopClickMonitor() {
  if (clickMonitorProc) {
    clickMonitorProc.kill('SIGTERM');
    clickMonitorProc = null;
    log('click-monitor stopped');
  }
}

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
    if (drawModeActive) app.focus({ steal: true });
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
    if (laserModeActive) {
      setLaserMode(overlayWindow, true);
      startClickMonitor();
    } else {
      setDrawMode(overlayWindow, false);
      stopClickMonitor();
    }
    overlayWindow.webContents.send(IPC_CHANNELS.LASER_MODE_CHANGED, laserModeActive);
    if (laserModeActive) app.focus({ steal: true });
  }
}

function clearAll() {
  if (overlayWindow) {
    overlayWindow.webContents.send(IPC_CHANNELS.CLEAR_ALL);
  }
}

async function takeScreenshot() {
  if (!overlayWindow) return;
  try {
    // Hide toolbar by sending a message to renderer
    overlayWindow.webContents.send('hide-toolbar-for-screenshot');
    await new Promise(r => setTimeout(r, 100));

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const scaleFactor = primaryDisplay.scaleFactor;

    // Capture the screen (behind overlay)
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.hide();
    await new Promise(r => setTimeout(r, 100));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: width * scaleFactor, height: height * scaleFactor },
    });

    // Show overlay again
    overlayWindow.show();
    if (drawModeActive || laserModeActive) {
      overlayWindow.setIgnoreMouseEvents(false);
    }

    if (sources.length === 0) {
      log('Screenshot: no sources found');
      overlayWindow.webContents.send('show-toolbar-after-screenshot');
      return;
    }

    const screenImage = sources[0].thumbnail;
    const overlayImage = await overlayWindow.webContents.capturePage();

    const screenSize = screenImage.getSize();
    const overlaySize = overlayImage.getSize();
    const screenBuf = screenImage.toBitmap();
    const overlayBuf = overlayImage.toBitmap();

    const sw = screenSize.width;
    const sh = screenSize.height;
    const ow = overlaySize.width;
    const oh = overlaySize.height;
    const composited = Buffer.from(screenBuf);

    const blendW = Math.min(sw, ow);
    const blendH = Math.min(sh, oh);

    for (let y = 0; y < blendH; y++) {
      for (let x = 0; x < blendW; x++) {
        const si = (y * sw + x) * 4;
        const oi = (y * ow + x) * 4;
        const srcA = overlayBuf[oi + 3] / 255;
        if (srcA > 0) {
          composited[si]     = Math.round(overlayBuf[oi] * srcA + composited[si] * (1 - srcA));
          composited[si + 1] = Math.round(overlayBuf[oi + 1] * srcA + composited[si + 1] * (1 - srcA));
          composited[si + 2] = Math.round(overlayBuf[oi + 2] * srcA + composited[si + 2] * (1 - srcA));
          composited[si + 3] = 255;
        }
      }
    }

    const result = nativeImage.createFromBitmap(composited, { width: sw, height: sh });
    clipboard.writeImage(result);
    log('Screenshot copied to clipboard');

    overlayWindow.webContents.send('show-toolbar-after-screenshot');
  } catch (err) {
    log(`Screenshot error: ${err}`);
    overlayWindow?.webContents.send('show-toolbar-after-screenshot');
  }
}

const GLOBAL_ACTIONS: Record<string, () => void> = {
  toggleDraw: toggleDrawMode,
  togglePointer: toggleLaserMode,
  clearAll: clearAll,
  screenshot: takeScreenshot,
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
    if (overlayWindow && !drawModeActive && !laserModeActive) {
      toggleDrawMode();
    }
  });

  app.on('activate', () => {
    if (overlayWindow && !drawModeActive && !laserModeActive) {
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
            {
              label: 'About Screen Paint0r',
              click: async () => {
                overlayWindow?.setAlwaysOnTop(true, 'floating');
                await dialog.showMessageBox({
                  type: 'info',
                  title: 'About Screen Paint0r',
                  message: 'Screen Paint0r',
                  detail: `Version ${__APP_VERSION__} (${__COMMIT_HASH__})\n\nThis is the Screen Paint0r, it paint0rs and point0rs on the screen.\n\nBy Andi Lauer.\nmail me : lauer AT safenow DOT de\nhttps://github.com/lauer-safenow/screen-paint0r`,
                });
                overlayWindow?.setAlwaysOnTop(true, 'screen-saver');
              },
            },
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

      // Send keybindings when renderer loads, then activate draw mode
      overlayWindow.webContents.on('did-finish-load', () => {
        overlayWindow?.webContents.send(IPC_CHANNELS.KEYBINDINGS, currentKeybindings);
        toggleDrawMode();
      });

      trayRef = createTray(
        () => toggleDrawMode(),
        () => clearAll(),
        () => toggleLaserMode(),
        () => openPreferences(),
        currentKeybindings,
      );
      log('App fully initialized.');

      // Color picker: temporarily lower overlay so native picker is visible
      ipcMain.on(IPC_CHANNELS.COLOR_PICKER_OPENED, () => {
        if (overlayWindow) {
          overlayWindow.setAlwaysOnTop(true, 'floating');
        }
      });

      ipcMain.on(IPC_CHANNELS.COLOR_PICKER_CLOSED, () => {
        if (overlayWindow) {
          overlayWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      });

      // Screenshot to clipboard
      ipcMain.on(IPC_CHANNELS.SCREENSHOT_TO_CLIPBOARD, () => {
        takeScreenshot();
      });

      // Preferences IPC handlers
      ipcMain.handle('get-keybindings', () => {
        return currentKeybindings;
      });

      ipcMain.handle('save-keybindings', (_event, kb: Keybindings) => {
        const sanitized = sanitizeKeybindings(kb);
        saveKeybindings(sanitized);
        applyKeybindings(sanitized);
        // Rebuild tray with new labels
        trayRef = createTray(
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
        trayRef = createTray(
          () => toggleDrawMode(),
          () => clearAll(),
          () => toggleLaserMode(),
          () => openPreferences(),
          defaults,
        );
        return defaults;
      });

      ipcMain.on(IPC_CHANNELS.SET_CLICK_THROUGH, (_event, clickThrough: boolean) => {
        if (!overlayWindow) return;
        if (clickThrough) {
          overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
          overlayWindow.setIgnoreMouseEvents(false);
        }
      });

      ipcMain.on(IPC_CHANNELS.TOGGLE_LASER, () => {
        toggleLaserMode();
      });

      ipcMain.on(IPC_CHANNELS.TOGGLE_DRAW, () => {
        toggleDrawMode();
      });

      ipcMain.on(IPC_CHANNELS.QUIT_APP, () => {
        log('Quit requested from toolbar');
        app.quit();
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
    stopClickMonitor();
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    // Keep running in tray
  });
}
