import { Tray, Menu, app } from 'electron';
import { createTrayIcon } from './create-icon';

let tray: Tray | null = null;

export function createTray(
  onToggleDraw: () => void,
  onClear: () => void,
  onToggleLaser: () => void,
) {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Screen Paint0r');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Draw Mode (Cmd+Opt+Ctrl+D)', click: onToggleDraw },
    { label: 'Toggle Laser Pointer (Cmd+Opt+Ctrl+P)', click: onToggleLaser },
    { label: 'Clear Drawings (Cmd+Opt+Ctrl+C)', click: onClear },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}
