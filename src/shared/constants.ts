export const IPC_CHANNELS = {
  DRAW_MODE_CHANGED: 'draw-mode-changed',
  CLEAR_ALL: 'clear-all',
  ESCAPE_PRESSED: 'escape-pressed',
} as const;

const isMac = process.platform === 'darwin';

export const SHORTCUTS = {
  TOGGLE_DRAW: isMac ? 'Command+Option+Control+D' : 'Ctrl+Alt+Shift+D',
  CLEAR_ALL: isMac ? 'Command+Option+Control+C' : 'Ctrl+Alt+Shift+C',
} as const;
