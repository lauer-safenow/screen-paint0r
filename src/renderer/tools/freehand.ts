import { Tool } from './tool';
import { Point, DrawingElement, DrawingStyle } from '../../shared/types';
import { DrawingEngine } from '../drawing-engine';

export class FreehandTool implements Tool {
  private points: Point[] = [];
  private style: DrawingStyle = { color: '#ff0000', width: 3 };

  onMouseDown(point: Point, style: DrawingStyle) {
    this.style = { ...style };
    this.points = [point];
  }

  onMouseMove(point: Point, ctx: CanvasRenderingContext2D) {
    this.points.push(point);
    this.renderPreview(ctx);
  }

  onMouseUp(): DrawingElement | null {
    if (this.points.length < 2) return null;
    const el: DrawingElement = {
      type: 'freehand',
      points: [...this.points],
      color: this.style.color,
      width: this.style.width,
    };
    this.points = [];
    return el;
  }

  renderPreview(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    const el: DrawingElement = {
      type: 'freehand',
      points: this.points,
      color: this.style.color,
      width: this.style.width,
    };
    DrawingEngine.renderElement(ctx, el);
  }
}
