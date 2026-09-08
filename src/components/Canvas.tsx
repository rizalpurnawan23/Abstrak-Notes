import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { PaperSize } from './Toolbar';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface CanvasProps {
  activeTool: 'pen' | 'eraser';
  color: string;
  penSize: number;
  zoom: number;
  paperSize: PaperSize;
  clearTrigger?: number;
  isDarkMode: boolean;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
}

// Paper ratios (Width x Height in px at standard 96DPI base scale)
const PAPER_DIMENSIONS: Record<Exclude<PaperSize, 'infinite'>, { w: number; h: number }> = {
  a4: { w: 794, h: 1123 },
  a5: { w: 559, h: 794 },
  letter: { w: 816, h: 1056 },
};

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ activeTool, color, penSize, zoom, paperSize, clearTrigger, isDarkMode, strokes, setStrokes }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const activePointerId = useRef<number | null>(null);
    const [eraserPos, setEraserPos] = useState<Point | null>(null);

    useImperativeHandle(ref, () => internalCanvasRef.current!);

    const isPointNearSegment = (p: Point, p1: Point, p2: Point, threshold = 16) => {
      const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
      if (l2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y) < threshold;
      let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      return Math.hypot(p.x - projX, p.y - projY) < threshold;
    };

    const drawSmoothStroke = (ctx: CanvasRenderingContext2D, pts: Point[], strokeColor: string, strokeWidth: number) => {
      if (pts.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        return;
      }

      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        return;
      }

      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    };

    const renderCanvas = useCallback(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr * zoom, dpr * zoom);

      // Workspace background color
      ctx.fillStyle = isDarkMode ? '#121212' : '#e8e8e8';
      ctx.fillRect(0, 0, rect.width / zoom, rect.height / zoom);

      // Paper Dimensions & Positioning
      let paperX = 0;
      let paperY = 0;
      let paperW = rect.width / zoom;
      let paperH = rect.height / zoom;

      if (paperSize !== 'infinite') {
        const dim = PAPER_DIMENSIONS[paperSize];
        paperW = dim.w;
        paperH = dim.h;
        paperX = Math.max(20, (rect.width / zoom - paperW) / 2);
        paperY = Math.max(20, (rect.height / zoom - paperH) / 2);

        // Draw Paper Shadow & Background Sheet
        ctx.fillStyle = isDarkMode ? '#1e1e1e' : '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 12 / zoom;
        ctx.shadowOffsetY = 4 / zoom;
        ctx.fillRect(paperX, paperY, paperW, paperH);
        ctx.shadowColor = 'transparent';
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Clip canvas rendering strictly to paper boundaries if paper size is fixed
      if (paperSize !== 'infinite') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(paperX, paperY, paperW, paperH);
        ctx.clip();
      }

      // Render committed strokes
      strokes.forEach((stroke) => {
        drawSmoothStroke(ctx, stroke.points, stroke.color, stroke.width);
      });

      // Active stroke
      if (currentPoints.current.length > 0 && activeTool === 'pen') {
        drawSmoothStroke(ctx, currentPoints.current, color, penSize);
      }

      if (paperSize !== 'infinite') {
        ctx.restore();
      }

      // Render Object Eraser Ring Indicator
      if (activeTool === 'eraser' && eraserPos) {
        ctx.beginPath();
        ctx.arc(eraserPos.x, eraserPos.y, 12 / zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4d4f';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      }

      ctx.restore();
    }, [strokes, isDarkMode, color, penSize, activeTool, zoom, eraserPos, paperSize]);

    useEffect(() => {
      renderCanvas();
    }, [renderCanvas]);

    // Prevent iPad OS Safari double-tap zoom & pointer gesture intercept
    useEffect(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;

      const preventTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) return;
        e.preventDefault();
      };

      canvas.addEventListener('touchstart', preventTouch, { passive: false });
      canvas.addEventListener('touchmove', preventTouch, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', preventTouch);
        canvas.removeEventListener('touchmove', preventTouch);
      };
    }, []);

    useEffect(() => {
      if (clearTrigger !== undefined && clearTrigger > 0) {
        setStrokes([]);
      }
    }, [clearTrigger, setStrokes]);

    const eraseStrokeAtPoint = (pt: Point) => {
      setStrokes((prevStrokes) =>
        prevStrokes.filter((stroke) => {
          for (let i = 0; i < stroke.points.length - 1; i++) {
            if (isPointNearSegment(pt, stroke.points[i], stroke.points[i + 1], 16 / zoom)) {
              return false;
            }
          }
          return true;
        })
      );
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'touch' && e.pointerId !== activePointerId.current && activePointerId.current !== null) {
        return;
      }

      isDrawing.current = true;
      activePointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = internalCanvasRef.current!.getBoundingClientRect();
      const pt = {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };

      if (activeTool === 'pen') {
        currentPoints.current = [pt];
        renderCanvas();
      } else if (activeTool === 'eraser') {
        setEraserPos(pt);
        eraseStrokeAtPoint(pt);
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = internalCanvasRef.current!.getBoundingClientRect();
      const pt = {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };

      if (activeTool === 'eraser') {
        setEraserPos(pt);
      }

      if (!isDrawing.current || e.pointerId !== activePointerId.current) return;

      const coalesced = e.nativeEvent.getCoalescedEvents
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];

      if (activeTool === 'pen') {
        coalesced.forEach((evt) => {
          currentPoints.current.push({
            x: (evt.clientX - rect.left) / zoom,
            y: (evt.clientY - rect.top) / zoom,
          });
        });
        renderCanvas();
      } else if (activeTool === 'eraser') {
        eraseStrokeAtPoint(pt);
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || e.pointerId !== activePointerId.current) return;

      isDrawing.current = false;
      activePointerId.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (activeTool === 'pen' && currentPoints.current.length > 0) {
        const newStroke: Stroke = {
          id: Date.now().toString(),
          points: [...currentPoints.current],
          color,
          width: penSize,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
      currentPoints.current = [];
      renderCanvas();
    };

    return (
      <canvas
        ref={internalCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setEraserPos(null)}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />
    );
  }
);

Canvas.displayName = 'Canvas';