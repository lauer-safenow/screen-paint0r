import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

function getBoundingRect() {
  const displays = screen.getAllDisplays();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of displays) {
    minX = Math.min(minX, d.bounds.x);
    minY = Math.min(minY, d.bounds.y);
    maxX = Math.max(maxX, d.bounds.x + d.bounds.width);
    maxY = Math.max(maxY, d.bounds.y + d.bounds.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function createOverlayWindow(): BrowserWindow {
  const bounds = getBoundingRect();

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    fullscreenable: false,
    ...(process.platform === 'darwin' ? { type: 'panel' } : { type: 'toolbar' }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Start in click-through mode
  win.setIgnoreMouseEvents(true, { forward: true });

  // Load the renderer HTML
  // In forge dev mode, MAIN_WINDOW_VITE_DEV_SERVER_URL is defined
  // In standalone mode, load from the dist directory
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (typeof MAIN_WINDOW_VITE_NAME !== 'undefined') {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  } else {
    // Standalone build: load index.html from same directory
    const htmlPath = path.join(__dirname, 'index.html');
    win.loadFile(htmlPath);
  }

  // Re-span on display changes
  const updateBounds = () => {
    const b = getBoundingRect();
    win.setBounds(b);
  };
  screen.on('display-added', updateBounds);
  screen.on('display-removed', updateBounds);
  screen.on('display-metrics-changed', updateBounds);

  return win;
}

export function setDrawMode(win: BrowserWindow, active: boolean) {
  if (active) {
    win.setIgnoreMouseEvents(false);
    win.focus();
  } else {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
}

export function setLaserMode(win: BrowserWindow, active: boolean) {
  // Laser mode: clicks pass through to apps below, mouse moves still tracked
  win.setIgnoreMouseEvents(true, { forward: true });
  if (active) win.focus();
}
