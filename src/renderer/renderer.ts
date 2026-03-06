import { ScreenPaintApi, ToolType, DrawingStyle } from '../shared/types';
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
let currentStyle: DrawingStyle = { color: '#ef4444', width: 4 };
let drawModeActive = false;
let isDragging = false;
let laserModeActive = false;

// Laser pointer state
interface LaserPoint { x: number; y: number; time: number; }
const laserTrail: LaserPoint[] = [];
const LASER_TRAIL_DURATION = 600; // ms
const LASER_DOT_RADIUS = 6;
let laserAnimFrame: number | null = null;

function renderLaser() {
  canvasManager.clearActive();
  const now = Date.now();
  const ctx = canvasManager.activeCtx;

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
    ctx.strokeStyle = `rgba(255, 30, 30, ${alpha * 0.7})`;
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
  ctx.fillStyle = 'rgba(255, 30, 30, 0.9)';
  ctx.fill();
  // Glow
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, LASER_DOT_RADIUS * 2.5, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(tip.x, tip.y, LASER_DOT_RADIUS * 0.5, tip.x, tip.y, LASER_DOT_RADIUS * 2.5);
  glow.addColorStop(0, 'rgba(255, 60, 60, 0.4)');
  glow.addColorStop(1, 'rgba(255, 60, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fill();

  if (laserModeActive) laserAnimFrame = requestAnimationFrame(renderLaser);
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
    api.sendEscapePressed();
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
);

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

// Keyboard shortcuts for tool switching
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && laserModeActive) {
    api.sendEscapePressed();
    return;
  }

  if (!drawModeActive) return;

  if (e.key === 'Escape') {
    api.sendEscapePressed();
    return;
  }

  // Undo: Cmd+Z (mac) / Ctrl+Z
  if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
    e.preventDefault();
    if (engine.undo()) redrawPersistent();
    return;
  }

  // Redo: Cmd+Y (mac) / Ctrl+Y, or Cmd+Shift+Z / Ctrl+Shift+Z
  if ((e.key === 'y' && (e.metaKey || e.ctrlKey)) ||
      (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
    e.preventDefault();
    if (engine.redo()) redrawPersistent();
    return;
  }

  const toolKeys: Record<string, ToolType> = {
    '1': 'freehand',
    '2': 'rectangle',
    '3': 'circle',
    '4': 'arrow',
    '5': 'eraser',
  };

  const tool = toolKeys[e.key];
  if (tool) {
    toolbar.setTool(tool);
    currentTool = tools[tool];
  }
});

// IPC handlers
api.onDrawModeChanged((active) => {
  drawModeActive = active;
  canvasManager.setInteractive(active);
  if (active) {
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

api.onLaserModeChanged((active) => {
  laserModeActive = active;
  canvasManager.setInteractive(active);
  toolbar.setPointerActive(active);
  if (active) {
    toolbar.show();
    laserTrail.length = 0;
    laserAnimFrame = requestAnimationFrame(renderLaser);
  } else {
    if (!drawModeActive) toolbar.hide();
    if (laserAnimFrame) cancelAnimationFrame(laserAnimFrame);
    laserAnimFrame = null;
    laserTrail.length = 0;
    canvasManager.clearActive();
  }
});
