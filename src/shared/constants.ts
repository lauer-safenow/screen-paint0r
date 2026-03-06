export const IPC_CHANNELS = {
  DRAW_MODE_CHANGED: 'draw-mode-changed',
  CLEAR_ALL: 'clear-all',
  ESCAPE_PRESSED: 'escape-pressed',
  LASER_MODE_CHANGED: 'laser-mode-changed',
  TOGGLE_LASER: 'toggle-laser',
  TOGGLE_DRAW: 'toggle-draw',
} as const;

const isMac = process.platform === 'darwin';

export const SHORTCUTS = {
  TOGGLE_DRAW: isMac ? 'Command+Option+Control+D' : 'Ctrl+Alt+Shift+D',
  CLEAR_ALL: isMac ? 'Command+Option+Control+C' : 'Ctrl+Alt+Shift+C',
  TOGGLE_LASER: isMac ? 'Command+Option+Control+P' : 'Ctrl+Alt+Shift+P',
} as const;
