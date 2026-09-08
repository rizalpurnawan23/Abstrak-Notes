import { useRef, useState, useCallback } from 'react';
import { Point, Stroke } from '../types/note';

interface UseCanvasOptions {
  color: string;
  lineWidth: number;
  isEraser: boolean;
}

export const useCanvas = ({ color, lineWidth, isEraser }: UseCanvasOptions) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);

  // Smooth intermediate points using quadratic curve midpoints
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      
      // Dynamic line thickness based on stroke width and Apple Pencil pressure
      const p = stroke.points[i].pressure || 0.5;
      ctx.lineWidth = stroke.width * (0.2 + p * 1.8);
      
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX, midY);
    }

    ctx.restore();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  }, [drawStroke]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };

    currentStrokeRef.current = [point];
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newPoint: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };

    currentStrokeRef.current.push(newPoint);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const tempStroke: Stroke = {
        points: currentStrokeRef.current,
        color,
        width: lineWidth,
        isEraser,
      };
      drawStroke(ctx, tempStroke);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        color,
        width: lineWidth,
        isEraser,
      });
      currentStrokeRef.current = [];
    }
  };

  return {
    canvasRef,
    startDrawing,
    draw,
    stopDrawing,
    redrawAll,
    strokes: strokesRef.current,
    setStrokes: (newStrokes: Stroke[]) => {
      strokesRef.current = newStrokes;
      redrawAll();
    },
  };
};