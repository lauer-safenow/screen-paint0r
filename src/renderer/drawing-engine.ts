import { DrawingElement, Point } from '../shared/types';

export class DrawingEngine {
  private elements: DrawingElement[] = [];

  addElement(element: DrawingElement) {
    this.elements.push(element);
  }

  removeElement(index: number) {
    this.elements.splice(index, 1);
  }

  clear() {
    this.elements = [];
  }

  getElements(): readonly DrawingElement[] {
    return this.elements;
  }

  hitTest(point: Point, tolerance: number = 8): number {
    // Test in reverse order (topmost first)
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.elementHitTest(this.elements[i], point, tolerance)) {
        return i;
      }
    }
    return -1;
  }

  private elementHitTest(el: DrawingElement, point: Point, tolerance: number): boolean {
    const t = tolerance + el.width / 2;

    switch (el.type) {
      case 'freehand':
        return el.points.some((p, i) => {
          if (i === 0) return this.distToPoint(point, p) <= t;
          return this.distToSegment(point, el.points[i - 1], p) <= t;
        });

      case 'rectangle': {
        const { start: s, end: e } = el;
        return (
          this.distToSegment(point, s, { x: e.x, y: s.y }) <= t ||
          this.distToSegment(point, { x: e.x, y: s.y }, e) <= t ||
          this.distToSegment(point, e, { x: s.x, y: e.y }) <= t ||
          this.distToSegment(point, { x: s.x, y: e.y }, s) <= t
        );
      }

      case 'circle': {
        const dx = (point.x - el.center.x) / el.radiusX;
        const dy = (point.y - el.center.y) / el.radiusY;
        const normalizedDist = Math.sqrt(dx * dx + dy * dy);
        const avgRadius = (el.radiusX + el.radiusY) / 2;
        return Math.abs(normalizedDist - 1) * avgRadius <= t;
      }

      case 'arrow':
        return this.distToSegment(point, el.start, el.end) <= t;
    }
  }

  private distToPoint(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private distToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.distToPoint(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return this.distToPoint(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  renderAll(ctx: CanvasRenderingContext2D) {
    for (const el of this.elements) {
      DrawingEngine.renderElement(ctx, el);
    }
  }

  static renderElement(ctx: CanvasRenderingContext2D, el: DrawingElement) {
    ctx.strokeStyle = el.color;
    ctx.lineWidth = el.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el.type) {
      case 'freehand':
        if (el.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        if (el.points.length === 2) {
          ctx.lineTo(el.points[1].x, el.points[1].y);
        } else {
          // Quadratic bezier smoothing
          for (let i = 1; i < el.points.length - 1; i++) {
            const midX = (el.points[i].x + el.points[i + 1].x) / 2;
            const midY = (el.points[i].y + el.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, midX, midY);
          }
          const last = el.points[el.points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
        break;

      case 'rectangle':
        ctx.beginPath();
        ctx.rect(
          el.start.x, el.start.y,
          el.end.x - el.start.x, el.end.y - el.start.y
        );
        ctx.stroke();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.ellipse(
          el.center.x, el.center.y,
          Math.abs(el.radiusX), Math.abs(el.radiusY),
          0, 0, Math.PI * 2
        );
        ctx.stroke();
        break;

      case 'arrow': {
        const { start, end } = el;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = Math.max(el.width * 4, 12);
        const headAngle = 0.45;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLen * Math.cos(angle - headAngle),
          end.y - headLen * Math.sin(angle - headAngle)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLen * Math.cos(angle + headAngle),
          end.y - headLen * Math.sin(angle + headAngle)
        );
        ctx.stroke();
        break;
      }
    }
  }
}
