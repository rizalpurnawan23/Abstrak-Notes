export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

export interface Note {
  id: string;
  title: string;
  strokes: Stroke[];
  createdAt: number;
  updatedAt: number;
}