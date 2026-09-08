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
    const isDraggingSelection = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const activePointerId = useRef<number | null>(null);

    const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
    const panStart = useRef<Point>({ x: 0, y: 0 });
    const lastDragPt = useRef<Point | null>(null);
    const [eraserPos, setEraserPos] = useState<Point | null>(null);
    const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
    const [selectionBounds, setSelectionBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

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

    // Stage 1: Ramer-Douglas-Peucker (RDP) Simplification
    const perpendicularDistance = (pt: Point, lineStart: Point, lineEnd: Point) => {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const mag = Math.hypot(dx, dy);
      if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
      return Math.abs(dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
    };

    // epsilon is reduced to 0.6 to refine the result
    const rdpSimplify = (pts: Point[], epsilon = 0.6): Point[] => {
      if (pts.length <= 2) return pts;
      let dmax = 0;
      let index = 0;
      const end = pts.length - 1;

      for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(pts[i], pts[0], pts[end]);
        if (d > dmax) {
          index = i;
          dmax = d;
        }
      }

      if (dmax > epsilon) {
        const rec1 = rdpSimplify(pts.slice(0, index + 1), epsilon);
        const rec2 = rdpSimplify(pts.slice(index), epsilon);
        return [...rec1.slice(0, rec1.length - 1), ...rec2];
      }
      return [pts[0], pts[end]];
    };

    // Stage 2: Adaptive Angle & Curvature Subdivision
    // maxAngleRad is reduced to 0.05 for a refinement
    const adaptiveSubdivide = (pts: Point[], maxAngleRad = 0.15): Point[] => {
      if (pts.length < 3) return pts;
      const result: Point[] = [pts[0]];

      for (let i = 0; i < pts.length - 2; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2];

        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const len1 = Math.hypot(v1.x, v1.y);
        const len2 = Math.hypot(v2.x, v2.y);

        if (len1 > 0 && len2 > 0) {
          const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
          const clampedDot = Math.max(-1, Math.min(1, dot));
          const angle = Math.acos(clampedDot);

          // If turning angle > threshold, inject curvature midpoints
          if (angle > maxAngleRad) {
            const steps = Math.min(6, Math.ceil(angle / maxAngleRad));
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              result.push({
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t,
              });
            }
          }
        }
        result.push(p2);
      }
      result.push(pts[pts.length - 1]);
      return result;
    };

    // Stage 3: Chaikin Corner Cutting
    const smoothChaikin = (pts: Point[], iterations = 2): Point[] => {
      if (pts.length <= 2) return pts;
      let current = pts;

      for (let it = 0; it < iterations; it++) {
        const next: Point[] = [current[0]];
        for (let i = 0; i < current.length - 1; i++) {
          const p0 = current[i];
          const p1 = current[i + 1];

          const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
          const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };

          next.push(q);
          next.push(r);
        }
        next.push(current[current.length - 1]);
        current = next;
      }

      return current;
    };

    // Master 3-Stage Pipeline Renderer
    const drawSmoothStroke = (ctx: CanvasRenderingContext2D, rawPts: Point[], strokeColor: string, strokeWidth: number) => {
      if (rawPts.length === 0) return;

      if (rawPts.length === 1) {
        ctx.beginPath();
        ctx.arc(rawPts[0].x, rawPts[0].y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        return;
      }

      // Execute 3-Stage Geometry Pipeline
      // Adjustment of epsilon and maxAngleRad
      const stage1 = rdpSimplify(rawPts, 0.6);
      const stage2 = adaptiveSubdivide(stage1, 0.15);
      const smoothed = smoothChaikin(stage2, 2);

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      ctx.moveTo(smoothed[0].x + 0.5, smoothed[0].y + 0.5);

      for (let i = 1; i < smoothed.length - 1; i++) {
        const midX = (smoothed[i].x + smoothed[i + 1].x) / 2;
        const midY = (smoothed[i].y + smoothed[i + 1].y) / 2;
        ctx.quadraticCurveTo(smoothed[i].x + 0.5, smoothed[i].y + 0.5, midX + 0.5, midY + 0.5);
      }

      ctx.lineTo(smoothed[smoothed.length - 1].x + 0.5, smoothed[smoothed.length - 1].y + 0.5);
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

    const computeSelectionBounds = useCallback((ids: string[], currentStrokes: Stroke[]) => {
      if (ids.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      currentStrokes.forEach((st) => {
        if (ids.includes(st.id)) {
          st.points.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          });
        }
      });

      return minX === Infinity ? null : { minX: minX - 10, minY: minY - 10, maxX: maxX + 10, maxY: maxY + 10 };
    }, []);

    const renderCanvas = useCallback(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.max(window.devicePixelRatio || 1, 3);
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr * zoom, dpr * zoom);
      ctx.translate(panOffset.x, panOffset.y);

      // Workspace background
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

      // Render vector strokes with 3-stage pipeline (Turquoise `#00f2fe` for lasso selection)
      strokes.forEach((stroke) => {
        const isSelected = selectedStrokeIds.includes(stroke.id);
        drawSmoothStroke(ctx, stroke.points, isSelected ? '#00f2fe' : stroke.color, isSelected ? stroke.width + 1 : stroke.width);
      });

      // Bounding box overlay
      const bounds = computeSelectionBounds(selectedStrokeIds, strokes);
      if (bounds) {
        ctx.save();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        ctx.fillStyle = 'rgba(0, 242, 254, 0.05)';
        ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        ctx.restore();
      }

      // Active live stroke
      if (currentPoints.current.length > 0 && activeTool === 'pen') {
        drawSmoothStroke(ctx, currentPoints.current, color, penSize);
      }

      // Lasso path
      if (currentPoints.current.length > 0 && activeTool === 'lasso') {
        ctx.beginPath();
        ctx.strokeStyle = '#00f2fe';
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

      // Eraser reticle
      if (activeTool === 'eraser' && eraserPos) {
        ctx.beginPath();
        ctx.arc(eraserPos.x, eraserPos.y, 12 / zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4d4f';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      }

      ctx.restore();
    }, [strokes, isDarkMode, color, penSize, activeTool, zoom, eraserPos, paperSize, gridType, panOffset, selectedStrokeIds, computeSelectionBounds]);

    useEffect(() => {
      renderCanvas();
      const bounds = computeSelectionBounds(selectedStrokeIds, strokes);
      setSelectionBounds(bounds);
    }, [renderCanvas, selectedStrokeIds, strokes, computeSelectionBounds]);

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

    const handleDeleteSelected = () => {
      setStrokes((prev) => prev.filter((s) => !selectedStrokeIds.includes(s.id)));
      setSelectedStrokeIds([]);
      setSelectionBounds(null);
    };

    const handleDeselect = () => {
      setSelectedStrokeIds([]);
      setSelectionBounds(null);
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

      if (
        selectedStrokeIds.length > 0 &&
        selectionBounds &&
        pt.x >= selectionBounds.minX &&
        pt.x <= selectionBounds.maxX &&
        pt.y >= selectionBounds.minY &&
        pt.y <= selectionBounds.maxY
      ) {
        isDraggingSelection.current = true;
        lastDragPt.current = pt;
        return;
      }

      if (activeTool === 'pan') {
        panStart.current = { x: e.clientX - panOffset.x * zoom, y: e.clientY - panOffset.y * zoom };
      } else if (activeTool === 'pen' || activeTool === 'lasso') {
        currentPoints.current = [pt];
        if (activeTool === 'pen') {
          setSelectedStrokeIds([]);
          setSelectionBounds(null);
        }
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

      if (isDraggingSelection.current && lastDragPt.current) {
        const dx = pt.x - lastDragPt.current.x;
        const dy = pt.y - lastDragPt.current.y;
        lastDragPt.current = pt;

        setStrokes((prev) =>
          prev.map((st) => {
            if (!selectedStrokeIds.includes(st.id)) return st;
            return {
              ...st,
              points: st.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
          })
        );
        return;
      }

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
      isDraggingSelection.current = false;
      lastDragPt.current = null;
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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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

        {selectionBounds && selectedStrokeIds.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${(selectionBounds.minX + panOffset.x) * zoom}px`,
              top: `${(selectionBounds.minY + panOffset.y) * zoom - 44}px`,
              display: 'flex',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: isDarkMode ? '#2c2c2e' : '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              zIndex: 120,
            }}
          >
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #ff4d4f',
                background: '#ff4d4f',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
              title="Delete Selected"
            >
              🗑️ Delete
            </button>
            <button
              onClick={handleDeselect}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              title="Deselect"
            >
              ✖️
            </button>
          </div>
        )}
      </div>
    );
  }
);

Canvas.displayName = 'Canvas';