import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { PaperSize, GridType, ToolType } from './Toolbar';

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
  activeTool: ToolType;
  color: string;
  penSize: number;
  zoom: number;
  paperSize: PaperSize;
  gridType: GridType;
  clearTrigger?: number;
  isDarkMode: boolean;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
}

const PAPER_DIMENSIONS: Record<Exclude<PaperSize, 'infinite'>, { w: number; h: number }> = {
  a4: { w: 794, h: 1123 },
  a5: { w: 559, h: 794 },
  letter: { w: 816, h: 1056 },
};

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(
  ({ activeTool, color, penSize, zoom, paperSize, gridType, clearTrigger, isDarkMode, strokes, setStrokes }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const activePointerId = useRef<number | null>(null);

    const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
    const panStart = useRef<Point>({ x: 0, y: 0 });
    const [eraserPos, setEraserPos] = useState<Point | null>(null);
    const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);

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

    // Sub-pixel aligned smooth stroke rendering for crisp anti-aliasing
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

      // 0.5px sub-pixel snap for ultra-sharp line rendering
      ctx.moveTo(pts[0].x + 0.5, pts[0].y + 0.5);

      if (pts.length === 2) {
        ctx.lineTo(pts[1].x + 0.5, pts[1].y + 0.5);
        ctx.stroke();
        return;
      }

      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x + 0.5, pts[i].y + 0.5, midX + 0.5, midY + 0.5);
      }
      ctx.lineTo(pts[pts.length - 1].x + 0.5, pts[pts.length - 1].y + 0.5);
      ctx.stroke();
    };

    const drawGridPattern = (ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number) => {
      if (gridType === 'none') return;

      ctx.save();
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1 / zoom;

      const spacing = 28;

      if (gridType === 'ruled') {
        for (let gy = y + spacing; gy < y + h; gy += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, gy + 0.5);
          ctx.lineTo(x + w, gy + 0.5);
          ctx.stroke();
        }
      } else if (gridType === 'graph') {
        for (let gx = x + spacing; gx < x + w; gx += spacing) {
          ctx.beginPath();
          ctx.moveTo(gx + 0.5, y);
          ctx.lineTo(gx + 0.5, y + h);
          ctx.stroke();
        }
        for (let gy = y + spacing; gy < y + h; gy += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, gy + 0.5);
          ctx.lineTo(x + w, gy + 0.5);
          ctx.stroke();
        }
      } else if (gridType === 'dots') {
        for (let gx = x + spacing; gx < x + w; gx += spacing) {
          for (let gy = y + spacing; gy < y + h; gy += spacing) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2 / zoom, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    };

    const renderCanvas = useCallback(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      
      // Anti-aliasing quality controls
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr * zoom, dpr * zoom);
      ctx.translate(panOffset.x, panOffset.y);

      // Background
      ctx.fillStyle = isDarkMode ? '#121212' : '#e8e8e8';
      ctx.fillRect(-panOffset.x, -panOffset.y, rect.width / zoom, rect.height / zoom);

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

        ctx.fillStyle = isDarkMode ? '#1e1e1e' : '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 12 / zoom;
        ctx.shadowOffsetY = 4 / zoom;
        ctx.fillRect(paperX, paperY, paperW, paperH);
        ctx.shadowColor = 'transparent';
      }

      drawGridPattern(ctx, paperW, paperH, paperX, paperY);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (paperSize !== 'infinite') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(paperX, paperY, paperW, paperH);
        ctx.clip();
      }

      // Render vector strokes with sub-pixel alignment
      strokes.forEach((stroke) => {
        const isSelected = selectedStrokeIds.includes(stroke.id);
        drawSmoothStroke(ctx, stroke.points, isSelected ? '#007acc' : stroke.color, stroke.width);
      });

      // Active live stroke
      if (currentPoints.current.length > 0 && activeTool === 'pen') {
        drawSmoothStroke(ctx, currentPoints.current, color, penSize);
      }

      // Lasso Path
      if (currentPoints.current.length > 0 && activeTool === 'lasso') {
        ctx.beginPath();
        ctx.strokeStyle = '#007acc';
        ctx.setLineDash([6, 6]);
        ctx.moveTo(currentPoints.current[0].x, currentPoints.current[0].y);
        for (let i = 1; i < currentPoints.current.length; i++) {
          ctx.lineTo(currentPoints.current[i].x, currentPoints.current[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (paperSize !== 'infinite') {
        ctx.restore();
      }

      // Eraser reticle ring
      if (activeTool === 'eraser' && eraserPos) {
        ctx.beginPath();
        ctx.arc(eraserPos.x, eraserPos.y, 12 / zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4d4f';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      }

      ctx.restore();
    }, [strokes, isDarkMode, color, penSize, activeTool, zoom, eraserPos, paperSize, gridType, panOffset, selectedStrokeIds]);

    useEffect(() => {
      renderCanvas();
    }, [renderCanvas]);

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
        setSelectedStrokeIds([]);
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
        x: (e.clientX - rect.left) / zoom - panOffset.x,
        y: (e.clientY - rect.top) / zoom - panOffset.y,
      };

      if (activeTool === 'pan') {
        panStart.current = { x: e.clientX - panOffset.x * zoom, y: e.clientY - panOffset.y * zoom };
      } else if (activeTool === 'pen' || activeTool === 'lasso') {
        currentPoints.current = [pt];
        if (activeTool === 'pen') setSelectedStrokeIds([]);
        renderCanvas();
      } else if (activeTool === 'eraser') {
        setEraserPos(pt);
        eraseStrokeAtPoint(pt);
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = internalCanvasRef.current!.getBoundingClientRect();
      const pt = {
        x: (e.clientX - rect.left) / zoom - panOffset.x,
        y: (e.clientY - rect.top) / zoom - panOffset.y,
      };

      if (activeTool === 'eraser') {
        setEraserPos(pt);
      }

      if (!isDrawing.current || e.pointerId !== activePointerId.current) return;

      if (activeTool === 'pan') {
        setPanOffset({
          x: (e.clientX - panStart.current.x) / zoom,
          y: (e.clientY - panStart.current.y) / zoom,
        });
        return;
      }

      const coalesced = e.nativeEvent.getCoalescedEvents
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent];

      if (activeTool === 'pen' || activeTool === 'lasso') {
        coalesced.forEach((evt) => {
          currentPoints.current.push({
            x: (evt.clientX - rect.left) / zoom - panOffset.x,
            y: (evt.clientY - rect.top) / zoom - panOffset.y,
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
      } else if (activeTool === 'lasso' && currentPoints.current.length > 2) {
        const lassoPts = currentPoints.current;
        const selected = strokes
          .filter((st) =>
            st.points.some((p) => {
              let inside = false;
              for (let i = 0, j = lassoPts.length - 1; i < lassoPts.length; j = i++) {
                const xi = lassoPts[i].x, yi = lassoPts[i].y;
                const xj = lassoPts[j].x, yj = lassoPts[j].y;
                const intersect =
                  yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
                if (intersect) inside = !inside;
              }
              return inside;
            })
          )
          .map((st) => st.id);
        setSelectedStrokeIds(selected);
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
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: activeTool === 'pan' ? 'grab' : activeTool === 'lasso' ? 'crosshair' : 'default',
        }}
      />
    );
  }
);

Canvas.displayName = 'Canvas';