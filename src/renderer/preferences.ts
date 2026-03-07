declare global {
  interface Window {
    prefsApi: {
      getKeybindings: () => Promise<Record<string, string>>;
      saveKeybindings: (kb: Record<string, string>) => Promise<void>;
      resetKeybindings: () => Promise<Record<string, string>>;
    };
  }
}

const LABELS: Record<string, string> = {
  toggleDraw: 'Toggle Draw Mode',
  togglePointer: 'Toggle Laser Pointer',
  clearAll: 'Clear All Drawings',
  undo: 'Undo',
  redo: 'Redo',
  minimizeMenu: 'Minimize Menu',
};

const DESCRIPTIONS: Record<string, string> = {
  toggleDraw: 'Global shortcut',
  togglePointer: 'Global shortcut',
  clearAll: 'Global shortcut',
  undo: 'While drawing',
  redo: 'While drawing',
  minimizeMenu: 'While drawing',
};

const isMac = navigator.platform.includes('Mac');

// Map e.code (physical key) to a key name for Electron accelerators
function codeToKey(code: string): string | null {
  // Modifier-only codes
  if (/^(Meta|Control|Alt|Shift)(Left|Right)?$/.test(code)) return null;

  // Letter keys: KeyA → A
  if (code.startsWith('Key')) return code.slice(3);
  // Digit keys: Digit0 → 0
  if (code.startsWith('Digit')) return code.slice(5);
  // Numpad: Numpad0 → num0
  if (code.startsWith('Numpad')) return 'num' + code.slice(6);

  const codeMap: Record<string, string> = {
    'Space': 'Space',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backslash': '\\',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Semicolon': ';',
    'Quote': "'",
    'Backquote': '`',
    'Minus': '-',
    'Equal': '=',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
  };

  return codeMap[code] || null;
}

function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const key = codeToKey(e.code);
  if (!key) return null;

  const parts: string[] = [];
  if (e.metaKey) parts.push(isMac ? 'Command' : 'Super');
  if (e.ctrlKey) parts.push(isMac ? 'Control' : 'Ctrl');
  if (e.altKey) parts.push(isMac ? 'Option' : 'Alt');
  if (e.shiftKey) parts.push('Shift');

  parts.push(key);
  return parts.join('+');
}

function formatDisplay(accelerator: string): string {
  if (!isMac) return accelerator;
  return accelerator
    .replace(/Command/g, '\u2318')
    .replace(/Control/g, '\u2303')
    .replace(/Option/g, '\u2325')
    .replace(/Shift/g, '\u21E7')
    .replace(/\+/g, ' ');
}

async function init() {
  const container = document.getElementById('bindings')!;
  const status = document.getElementById('status')!;
  let keybindings = await window.prefsApi.getKeybindings();

  function renderBindings() {
    container.innerHTML = '';

    for (const [action, accelerator] of Object.entries(keybindings)) {
      const row = document.createElement('div');
      row.className = 'binding-row';

      const labelCol = document.createElement('div');
      labelCol.className = 'binding-label';
      const name = document.createElement('div');
      name.className = 'binding-name';
      name.textContent = LABELS[action] || action;
      const desc = document.createElement('div');
      desc.className = 'binding-desc';
      desc.textContent = DESCRIPTIONS[action] || '';
      labelCol.appendChild(name);
      labelCol.appendChild(desc);

      const input = document.createElement('div');
      input.className = 'binding-input';
      input.textContent = formatDisplay(accelerator);
      input.tabIndex = 0;
      input.dataset.action = action;

      let recording = false;

      input.addEventListener('focus', () => {
        recording = true;
        input.classList.add('recording');
        input.textContent = 'Press shortcut…';
      });

      input.addEventListener('blur', () => {
        recording = false;
        input.classList.remove('recording');
        input.textContent = formatDisplay(keybindings[action]);
      });

      input.addEventListener('keydown', (e) => {
        if (!recording) return;
        e.preventDefault();
        e.stopPropagation();

        const acc = keyEventToAccelerator(e);
        if (!acc) return;

        keybindings[action] = acc;
        input.textContent = formatDisplay(acc);
        input.classList.remove('recording');
        recording = false;
        input.blur();
      });

      row.appendChild(labelCol);
      row.appendChild(input);
      container.appendChild(row);
    }
  }

  renderBindings();

  document.getElementById('save')!.addEventListener('click', async () => {
    await window.prefsApi.saveKeybindings(keybindings);
    status.textContent = 'Saved! Shortcuts updated.';
    status.className = 'status success';
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 2000);
  });

  document.getElementById('reset')!.addEventListener('click', async () => {
    keybindings = await window.prefsApi.resetKeybindings();
    renderBindings();
    status.textContent = 'Reset to defaults.';
    status.className = 'status success';
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 2000);
  });
}

init();
