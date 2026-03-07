import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class CircleTool implements Tool {
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

  private getEllipse() {
    let rx = Math.abs(this.current.x - this.start.x) / 2;
    let ry = Math.abs(this.current.y - this.start.y) / 2;
    if (this.shift) {
      const r = Math.max(rx, ry);
      rx = r;
      ry = r;
    }
    const cx = (this.start.x + this.current.x) / 2;
    const cy = (this.start.y + this.current.y) / 2;
    return { cx, cy, rx, ry };
  }

  onMouseUp(): DrawingElement | null {
    const { cx, cy, rx, ry } = this.getEllipse();
    if (rx === 0 && ry === 0) return null;
    return {
      type: 'circle',
      center: { x: cx, y: cy },
      radiusX: rx,
      radiusY: ry,
      color: this.style.color,
      width: this.style.width,
    };
  }

  renderPreview(ctx: CanvasRenderingContext2D) {
    const { cx, cy, rx, ry } = this.getEllipse();
    if (rx === 0 && ry === 0) return;
    const el: DrawingElement = {
      type: 'circle',
      center: { x: cx, y: cy },
      radiusX: rx,
      radiusY: ry,
      color: this.style.color,
      width: this.style.width,
    };
    DrawingEngine.renderElement(ctx, el);
  }
}
