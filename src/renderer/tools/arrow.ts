import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class ArrowTool implements Tool {
  private start: Point = { x: 0, y: 0 };
  private current: Point = { x: 0, y: 0 };
  private style: DrawingStyle = { color: '#ff0000', width: 3 };

  onMouseDown(point: Point, style: DrawingStyle) {
    this.start = point;
    this.current = point;
    this.style = { ...style };
  }

  onMouseMove(point: Point, ctx: CanvasRenderingContext2D) {
    this.current = point;
    this.renderPreview(ctx);
  }

  onMouseUp(): DrawingElement | null {
    if (this.start.x === this.current.x && this.start.y === this.current.y) return null;
    return {
      type: 'arrow',
      start: { ...this.start },
      end: { ...this.current },
      color: this.style.color,
      width: this.style.width,
    };
  }

  renderPreview(ctx: CanvasRenderingContext2D) {
    if (this.start.x === this.current.x && this.start.y === this.current.y) return;
    const el: DrawingElement = {
      type: 'arrow',
      start: this.start,
      end: this.current,
      color: this.style.color,
      width: this.style.width,
    };
    DrawingEngine.renderElement(ctx, el);
  }
}
