# Screen Paint0r

Draw on your screen. Annotations stay visible until you clear them.

## Features

- **Freehand drawing** with smooth bezier curves
- **Shapes** — rectangle, circle/ellipse, arrow
- **Eraser** — removes entire strokes
- **Laser pointer** mode with red dot and fading trail
- **Undo / Redo**
- **Color picker** with presets + custom colors
- **Line width** selector (thin / medium / thick)
- **Draggable toolbar**
- Transparent overlay — everything underneath stays clickable when not drawing
- System tray icon with context menu

## Shortcuts

| Action | macOS | Linux |
|---|---|---|
| Toggle draw mode | `Cmd+Option+Control+D` | `Ctrl+Alt+Shift+D` |
| Toggle laser pointer | `Cmd+Option+Control+P` | `Ctrl+Alt+Shift+P` |
| Clear all drawings | `Cmd+Option+Control+C` | `Ctrl+Alt+Shift+C` |
| Exit current mode | `Escape` | `Escape` |
| Undo | `Cmd+Z` | `Ctrl+Z` |
| Redo | `Cmd+Y` / `Cmd+Shift+Z` | `Ctrl+Y` / `Ctrl+Shift+Z` |
| Switch tool | `1`–`5` | `1`–`5` |

### Tools

| Key | Tool |
|-----|------|
| `1` | Freehand pen |
| `2` | Rectangle (hold Shift for square) |
| `3` | Circle / Ellipse (hold Shift for circle) |
| `4` | Arrow |
| `5` | Eraser |

## Getting Started

```bash
npm install

# Dev mode (quick iteration, shows as "Electron" in dock)
npm start

# Package as a proper macOS app
npm run pack

# Launch the packaged app
open "release/Screen Paint0r-darwin-arm64/Screen Paint0r.app"
```

## How It Works

A transparent, always-on-top overlay window spans all monitors. Activating draw mode captures mouse input on the overlay so you can draw on a canvas. Deactivating lets clicks pass through to whatever is underneath.

Drawing uses a dual-canvas architecture — a persistent layer for completed strokes and an active layer for live previews — both scaled for HiDPI/Retina displays.

## Tech Stack

- **Electron** — overlay window, global shortcuts, tray
- **TypeScript** — all source code
- **HTML5 Canvas** — drawing engine
- **esbuild** — build tooling

## License

MIT
