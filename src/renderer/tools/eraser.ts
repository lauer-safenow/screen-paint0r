import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class EraserTool implements Tool {
  private engine: DrawingEngine;
  private onErased: () => void;

  constructor(engine: DrawingEngine, onErased: () => void) {
    this.engine = engine;
    this.onErased = onErased;
  }

  onMouseDown(point: Point, _style: DrawingStyle) {
    this.tryErase(point);
  }

  onMouseMove(point: Point, _ctx: CanvasRenderingContext2D) {
    // Erase on drag too
    this.tryErase(point);
  }

  onMouseUp(): DrawingElement | null {
    return null;
  }

  renderPreview(_ctx: CanvasRenderingContext2D) {
    // No preview for eraser
  }

  private tryErase(point: Point) {
    const idx = this.engine.hitTest(point);
    if (idx >= 0) {
      this.engine.removeElement(idx);
      this.onErased();
    }
  }
}
