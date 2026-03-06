import { Tray, Menu, nativeImage, app } from 'electron';

let tray: Tray | null = null;

function createIcon(): Electron.NativeImage {
  // Create a 16x16 icon using a canvas-rendered PNG via nativeImage
  const size = 16;
  const buf = Buffer.alloc(size * size * 4, 0);

  // Draw a simple pencil diagonal line (white pixels)
  for (let i = 2; i < 14; i++) {
    const row = size - 1 - i; // flip so pencil goes bottom-left to top-right
    const col = i;
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const idx = (r * size + c) * 4;
          // BGRA format on macOS
          buf[idx] = 255;     // B
          buf[idx + 1] = 255; // G
          buf[idx + 2] = 255; // R
          buf[idx + 3] = 255; // A
        }
      }
    }
  }

  // Add pencil tip (small triangle at bottom-left)
  for (const [r, c] of [[13, 1], [14, 1], [14, 0]]) {
    if (r < size && c < size) {
      const idx = (r * size + c) * 4;
      buf[idx] = 255; buf[idx + 1] = 255; buf[idx + 2] = 255; buf[idx + 3] = 255;
    }
  }

  const img = nativeImage.createFromBitmap(buf, { width: size, height: size });
  if (process.platform === 'darwin') {
    img.setTemplateImage(true);
  }
  return img;
}

export function createTray(onToggleDraw: () => void, onClear: () => void) {
  const icon = createIcon();
  tray = new Tray(icon);
  tray.setToolTip('Screen Paint0r');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Draw Mode (Cmd+Opt+Ctrl+D)', click: onToggleDraw },
    { label: 'Clear Drawings (Cmd+Opt+Ctrl+C)', click: onClear },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}
