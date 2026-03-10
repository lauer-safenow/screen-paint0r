export interface Keybindings {
  // Global shortcuts (Electron accelerator format)
  toggleDraw: string;
  togglePointer: string;
  clearAll: string;
  screenshot: string;
  // Local shortcuts (key + modifiers)
  undo: string;
  redo: string;
  minimizeMenu: string;
}

const isMac = typeof process !== 'undefined' && process.platform === 'darwin';

export const DEFAULT_KEYBINDINGS: Keybindings = {
  toggleDraw: isMac ? 'Command+Option+Control+D' : 'Ctrl+Alt+Shift+D',
  togglePointer: isMac ? 'Command+Option+Control+P' : 'Ctrl+Alt+Shift+P',
  clearAll: isMac ? 'Command+Option+Control+C' : 'Ctrl+Alt+Shift+C',
  screenshot: isMac ? 'Command+Option+Control+S' : 'Ctrl+Alt+Shift+S',
  undo: isMac ? 'Command+Z' : 'Ctrl+Z',
  redo: isMac ? 'Command+Shift+Z' : 'Ctrl+Y',
  minimizeMenu: isMac ? 'Command+M' : 'Ctrl+M',
};

// Global shortcuts are registered by main process via Electron globalShortcut
export const GLOBAL_SHORTCUT_KEYS: (keyof Keybindings)[] = [
  'toggleDraw', 'togglePointer', 'clearAll', 'screenshot',
];

// Local shortcuts are handled in the renderer via keydown events
export const LOCAL_SHORTCUT_KEYS: (keyof Keybindings)[] = [
  'undo', 'redo', 'minimizeMenu',
];

/**
 * Parse an accelerator string into components for matching KeyboardEvent.
 * Uses e.key (labeled character) by default so shortcuts match keyboard layout.
 * Falls back to e.code (physical key) only for Option/Alt combos where
 * macOS produces composed characters (e.g. Option+B = ∫).
 */
export function matchesAccelerator(e: KeyboardEvent, accelerator: string): boolean {
  const parts = accelerator.split('+').map(p => p.trim());
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1).map(m => m.toLowerCase());
  const modSet = new Set(mods);

  const needMeta = modSet.has('command') || modSet.has('cmd') || modSet.has('super');
  const needCtrl = modSet.has('control') || modSet.has('ctrl');
  const needAlt = modSet.has('alt') || modSet.has('option');
  const needShift = modSet.has('shift');

  if (e.metaKey !== needMeta) return false;
  if (e.ctrlKey !== needCtrl) return false;
  if (e.altKey !== needAlt) return false;
  if (e.shiftKey !== needShift) return false;

  const keyUpper = key.toUpperCase();

  // Special keys: always match via e.code
  const specialMap: Record<string, string> = {
    'SPACE': 'Space', 'ENTER': 'Enter', 'BACKSPACE': 'Backspace',
    'DELETE': 'Delete', 'TAB': 'Tab', 'ESCAPE': 'Escape',
    'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight',
    ',': 'Comma', '.': 'Period', '/': 'Slash', '\\': 'Backslash',
    '[': 'BracketLeft', ']': 'BracketRight', ';': 'Semicolon',
    "'": 'Quote', '`': 'Backquote', '-': 'Minus', '=': 'Equal',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
  };
  const expectedCode = specialMap[keyUpper] || specialMap[key];
  if (expectedCode) {
    return e.code === expectedCode;
  }

  // For Option/Alt combos, use e.code (physical key) to avoid composed chars
  if (needAlt) {
    if (keyUpper.length === 1 && keyUpper >= 'A' && keyUpper <= 'Z') {
      return e.code === 'Key' + keyUpper;
    }
    if (keyUpper.length === 1 && keyUpper >= '0' && keyUpper <= '9') {
      return e.code === 'Digit' + keyUpper;
    }
  }

  // For non-Option combos, use e.key (respects keyboard layout — DE, FR, etc.)
  return e.key.toLowerCase() === key.toLowerCase();
}
