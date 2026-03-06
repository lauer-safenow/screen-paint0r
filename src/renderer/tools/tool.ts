import { Point, DrawingElement, DrawingStyle } from '../../shared/types';

export interface Tool {
  onMouseDown(point: Point, style: DrawingStyle): void;
  onMouseMove(point: Point, ctx: CanvasRenderingContext2D, shiftKey: boolean): void;
  onMouseUp(point: Point): DrawingElement | null;
  renderPreview(ctx: CanvasRenderingContext2D): void;
}
