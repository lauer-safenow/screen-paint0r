import { ScreenPaintApi, ToolType, DrawingStyle } from '../shared/types';
import { matchesAccelerator } from '../shared/keybindings';
import { CanvasManager } from './canvas-manager';
import { DrawingEngine } from './drawing-engine';
import { Toolbar } from './toolbar/toolbar';
import { Tool } from './tools/tool';
import { FreehandTool } from './tools/freehand';
import { RectangleTool } from './tools/rectangle';
import { CircleTool } from './tools/circle';
import { ArrowTool } from './tools/arrow';
import { EraserTool } from './tools/eraser';

declare global {
  interface Window {
    screenPaintApi: ScreenPaintApi;
  }
}

const api = window.screenPaintApi;
const app = document.getElementById('app')!;

const canvasManager = new CanvasManager(app);
const engine = new DrawingEngine();

function redrawPersistent() {
  canvasManager.clearPersistent();
  engine.renderAll(canvasManager.persistentCtx);
}

const eraserTool = new EraserTool(engine, redrawPersistent);

const tools: Record<ToolType, Tool> = {
  freehand: new FreehandTool(),
  rectangle: new RectangleTool(),
  circle: new CircleTool(),
  arrow: new ArrowTool(),
  eraser: eraserTool,
};

let currentTool: Tool = tools.freehand;
let currentStyle: DrawingStyle = { color: '#ffffff', width: 4 };
let drawModeActive = false;
let isDragging = false;
let laserModeActive = false;

// Keybindings (will be set from main process)
let keybindings: Record<string, string> = {};

// Laser pointer state
interface LaserPoint { x: number; y: number; time: number; }
const laserTrail: LaserPoint[] = [];
const LASER_TRAIL_DURATION = 600; // ms
const LASER_DOT_RADIUS = 6;
let laserAnimFrame: number | null = null;
let laserColor = '#fa8072'; // salmon

// Radar pop animation state
interface RadarPop { x: number; y: number; startTime: number; }
const radarPops: RadarPop[] = [];
const RADAR_DURATION = 500; // ms
const RADAR_MAX_RADIUS = 40;
const RADAR_RINGS = 2;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function renderLaser() {
  canvasManager.clearActive();
  const now = Date.now();
  const ctx = canvasManager.activeCtx;
  const { r, g, b } = hexToRgb(laserColor);

  // Remove expired points, but always keep the last one (current position)
  while (laserTrail.length > 1 && now - laserTrail[0].time > LASER_TRAIL_DURATION) {
    laserTrail.shift();
  }

  if (laserTrail.length === 0) {
    if (laserModeActive) laserAnimFrame = requestAnimationFrame(renderLaser);
    return;
  }

  // Draw fading trail
  for (let i = 1; i < laserTrail.length; i++) {
    const age = now - laserTrail[i].time;
    const alpha = Math.max(0, 1 - age / LASER_TRAIL_DURATION);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`;
    ctx.lineWidth = 3 * alpha + 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(laserTrail[i - 1].x, laserTrail[i - 1].y);
    ctx.lineTo(laserTrail[i].x, laserTrail[i].y);
    ctx.stroke();
  }

  // Draw laser dot at current position
  const tip = laserTrail[laserTrail.length - 1];
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, LASER_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
  ctx.fill();
  // Glow
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, LASER_DOT_RADIUS * 2.5, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(tip.x, tip.y, LASER_DOT_RADIUS * 0.5, tip.x, tip.y, LASER_DOT_RADIUS * 2.5);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
  glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = glow;
  ctx.fill();

  // Draw radar pops
  for (let i = radarPops.length - 1; i >= 0; i--) {
    const pop = radarPops[i];
    const age = now - pop.startTime;
    if (age > RADAR_DURATION) {
      radarPops.splice(i, 1);
      continue;
    }
    const progress = age / RADAR_DURATION;
    for (let ring = 0; ring < RADAR_RINGS; ring++) {
      const ringDelay = ring * 0.15;
      const ringProgress = Math.max(0, (progress - ringDelay) / (1 - ringDelay));
      if (ringProgress <= 0) continue;
      const radius = RADAR_MAX_RADIUS * ringProgress;
      const alpha = (1 - ringProgress) * 0.8;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = 2 * (1 - ringProgress) + 0.5;
      ctx.stroke();
    }
    // Center dot that fades
    const dotAlpha = (1 - progress) * 0.9;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, 3 * (1 - progress) + 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dotAlpha})`;
    ctx.fill();
  }

  if (laserModeActive || radarPops.length > 0) laserAnimFrame = requestAnimationFrame(renderLaser);
}

const toolbar = new Toolbar(
  app,
  (state) => {
    currentTool = tools[state.activeTool];
    currentStyle = state.style;
  },
  () => {
    engine.clear();
    canvasManager.clearPersistent();
    canvasManager.clearActive();
  },
  () => {
    api.sendQuitApp();
  },
  () => {
    if (engine.undo()) redrawPersistent();
  },
  () => {
    if (engine.redo()) redrawPersistent();
  },
  () => {
    api.sendToggleLaser();
  },
  () => {
    api.sendToggleDraw();
  },
  () => {
    api.sendColorPickerOpened();
  },
  () => {
    api.sendColorPickerClosed();
  },
  () => {
    api.sendScreenshotToClipboard();
  },
  (color: string) => {
    laserColor = color;
  },
);

// Toolbar hover: toggle click-through so toolbar stays interactive in laser mode
let toolbarHovered = false;
const toolbarEl = toolbar.getElement();
toolbarEl.addEventListener('mouseenter', () => {
  if (laserModeActive) {
    toolbarHovered = true;
    api.sendSetClickThrough(false);
  }
});
toolbarEl.addEventListener('mouseleave', () => {
  if (laserModeActive && toolbarHovered) {
    toolbarHovered = false;
    api.sendSetClickThrough(true);
  }
});

// Mouse event handlers
canvasManager.activeCanvas.addEventListener('mousedown', (e) => {
  if (laserModeActive) return;
  if (!drawModeActive) return;
  if (toolbar.isEventOnToolbar(e)) return;
  isDragging = true;
  const point = { x: e.clientX, y: e.clientY };
  canvasManager.clearActive();
  currentTool.onMouseDown(point, currentStyle);
});

canvasManager.activeCanvas.addEventListener('mousemove', (e) => {
  if (laserModeActive) {
    laserTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
    return;
  }
  if (!drawModeActive || !isDragging) return;
  const point = { x: e.clientX, y: e.clientY };
  canvasManager.clearActive();
  currentTool.onMouseMove(point, canvasManager.activeCtx, e.shiftKey);
});

canvasManager.activeCanvas.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  const point = { x: e.clientX, y: e.clientY };
  const element = currentTool.onMouseUp(point);
  canvasManager.clearActive();
  if (element) {
    engine.addElement(element);
    redrawPersistent();
  }
});

// Keyboard shortcuts (configurable)
document.addEventListener('keydown', (e) => {
  if (!drawModeActive && !laserModeActive) return;

  if (keybindings.undo && matchesAccelerator(e, keybindings.undo)) {
    e.preventDefault();
    if (engine.undo()) redrawPersistent();
    return;
  }

  if (keybindings.redo && matchesAccelerator(e, keybindings.redo)) {
    e.preventDefault();
    if (engine.redo()) redrawPersistent();
    return;
  }

  if (keybindings.minimizeMenu && matchesAccelerator(e, keybindings.minimizeMenu)) {
    e.preventDefault();
    toolbar.toggleMinimized();
    return;
  }
});

// IPC handlers
api.onKeybindings((kb) => {
  keybindings = kb;
});

api.onDrawModeChanged((active) => {
  drawModeActive = active;
  canvasManager.setInteractive(active);
  if (active) {
    toolbar.setMinimized(false);
    toolbar.show();
  } else {
    toolbar.hide();
    isDragging = false;
    canvasManager.clearActive();
  }
});

api.onClearAll(() => {
  engine.clear();
  canvasManager.clearPersistent();
  canvasManager.clearActive();
});

api.onHideToolbarForScreenshot(() => {
  toolbar.hide();
});

api.onShowToolbarAfterScreenshot(() => {
  if (drawModeActive || laserModeActive) {
    toolbar.show();
  }
});

api.onLaserClick((x, y) => {
  if (!laserModeActive) return;
  radarPops.push({ x, y, startTime: Date.now() });
  // Ensure animation loop is running to render the pop
  if (!laserAnimFrame) {
    laserAnimFrame = requestAnimationFrame(renderLaser);
  }
});

api.onLaserModeChanged((active) => {
  laserModeActive = active;
  canvasManager.setInteractive(active);
  toolbar.setPointerActive(active);
  toolbarHovered = false;
  if (active) {
    toolbar.setMinimized(false);
    toolbar.show();
    laserTrail.length = 0;
    laserAnimFrame = requestAnimationFrame(renderLaser);
  } else {
    if (!drawModeActive) toolbar.hide();
    if (laserAnimFrame) cancelAnimationFrame(laserAnimFrame);
    laserAnimFrame = null;
    laserTrail.length = 0;
    radarPops.length = 0;
    canvasManager.clearActive();
  }
});
