export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'freehand' | 'rectangle' | 'circle' | 'arrow' | 'eraser';

export type DrawingElement =
  | { type: 'freehand'; points: Point[]; color: string; width: number }
  | { type: 'rectangle'; start: Point; end: Point; color: string; width: number }
  | { type: 'circle'; center: Point; radiusX: number; radiusY: number; color: string; width: number }
  | { type: 'arrow'; start: Point; end: Point; color: string; width: number };

export interface DrawingStyle {
  color: string;
  width: number;
}

export interface ScreenPaintApi {
  onDrawModeChanged: (callback: (active: boolean) => void) => void;
  onClearAll: (callback: () => void) => void;
  sendEscapePressed: () => void;
}
