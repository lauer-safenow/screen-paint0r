export const IPC_CHANNELS = {
  DRAW_MODE_CHANGED: 'draw-mode-changed',
  CLEAR_ALL: 'clear-all',
  ESCAPE_PRESSED: 'escape-pressed',
  LASER_MODE_CHANGED: 'laser-mode-changed',
  TOGGLE_LASER: 'toggle-laser',
  TOGGLE_DRAW: 'toggle-draw',
  KEYBINDINGS: 'keybindings',
  COLOR_PICKER_OPENED: 'color-picker-opened',
  COLOR_PICKER_CLOSED: 'color-picker-closed',
  SCREENSHOT_TO_CLIPBOARD: 'screenshot-to-clipboard',
} as const;
