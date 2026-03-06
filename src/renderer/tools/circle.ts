import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class CircleTool implements Tool {
  private center: Point = { x: 0, y: 0 };
  private current: Point = { x: 0, y: 0 };
  private style: DrawingStyle = { color: '#ff0000', width: 3 };
  private shift = false;

  onMouseDown(point: Point, style: DrawingStyle) {
    this.center = point;
    this.current = point;
    this.style = { ...style };
  }

  onMouseMove(point: Point, ctx: CanvasRenderingContext2D, shiftKey: boolean) {
    this.shift = shiftKey;
    this.current = point;
    this.renderPreview(ctx);
  }

  onMouseUp(): DrawingElement | null {
    const rx = Math.abs(this.current.x - this.center.x);
    const ry = this.shift ? rx : Math.abs(this.current.y - this.center.y);
    if (rx === 0 && ry === 0) return null;
    return {
      type: 'circle',
      center: { ...this.center },
      radiusX: rx,
      radiusY: ry,
      color: this.style.color,
      width: this.style.width,
    };
  }

  renderPreview(ctx: CanvasRenderingContext2D) {
    const rx = Math.abs(this.current.x - this.center.x);
    const ry = this.shift ? rx : Math.abs(this.current.y - this.center.y);
    if (rx === 0 && ry === 0) return;
    const el: DrawingElement = {
      type: 'circle',
      center: this.center,
      radiusX: rx,
      radiusY: ry,
      color: this.style.color,
      width: this.style.width,
    };
    DrawingEngine.renderElement(ctx, el);
  }
}
