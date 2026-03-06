import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class RectangleTool implements Tool {
  private start: Point = { x: 0, y: 0 };
  private current: Point = { x: 0, y: 0 };
  private style: DrawingStyle = { color: '#ff0000', width: 3 };
  private shift = false;

  onMouseDown(point: Point, style: DrawingStyle) {
    this.start = point;
    this.current = point;
    this.style = { ...style };
  }

  onMouseMove(point: Point, ctx: CanvasRenderingContext2D, shiftKey: boolean) {
    this.shift = shiftKey;
    this.current = point;
    this.renderPreview(ctx);
  }

  onMouseUp(): DrawingElement | null {
    const end = this.getEnd();
    if (end.x === this.start.x && end.y === this.start.y) return null;
    return {
      type: 'rectangle',
      start: { ...this.start },
      end,
      color: this.style.color,
      width: this.style.width,
    };
  }

  renderPreview(ctx: CanvasRenderingContext2D) {
    const el: DrawingElement = {
      type: 'rectangle',
      start: this.start,
      end: this.getEnd(),
      color: this.style.color,
      width: this.style.width,
    };
    DrawingEngine.renderElement(ctx, el);
  }

  private getEnd(): Point {
    if (!this.shift) return this.current;
    const dx = this.current.x - this.start.x;
    const dy = this.current.y - this.start.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: this.start.x + size * Math.sign(dx),
      y: this.start.y + size * Math.sign(dy),
    };
  }
}
