import { Tray, Menu, app } from 'electron';
import { createTrayIcon } from './create-icon';
import { Keybindings } from '../shared/keybindings';

let tray: Tray | null = null;

function formatShortcut(accelerator: string): string {
  return accelerator
    .replace('Command+Option+Control', 'Cmd+Opt+Ctrl')
    .replace('Ctrl+Alt+Shift', 'Ctrl+Alt+Shift');
}

export function createTray(
  onToggleDraw: () => void,
  onClear: () => void,
  onToggleLaser: () => void,
  onPreferences: () => void,
  keybindings?: Keybindings,
) {
  if (!tray) {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Screen Paint0r');
  }

  const drawLabel = keybindings ? ` (${formatShortcut(keybindings.toggleDraw)})` : '';
  const laserLabel = keybindings ? ` (${formatShortcut(keybindings.togglePointer)})` : '';
  const clearLabel = keybindings ? ` (${formatShortcut(keybindings.clearAll)})` : '';

  const contextMenu = Menu.buildFromTemplate([
    { label: `Toggle Draw Mode${drawLabel}`, click: onToggleDraw },
    { label: `Toggle Laser Pointer${laserLabel}`, click: onToggleLaser },
    { label: `Clear Drawings${clearLabel}`, click: onClear },
    { type: 'separator' },
    { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: onPreferences },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}
