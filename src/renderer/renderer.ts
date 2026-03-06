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
  }
);

// Mouse event handlers
canvasManager.activeCanvas.addEventListener('mousedown', (e) => {
  if (!drawModeActive) return;
  isDragging = true;
  const point = { x: e.clientX, y: e.clientY };
  canvasManager.clearActive();
  currentTool.onMouseDown(point, currentStyle);
});

canvasManager.activeCanvas.addEventListener('mousemove', (e) => {
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
  if (!drawModeActive) return;

  if (e.key === 'Escape') {
    api.sendEscapePressed();
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
