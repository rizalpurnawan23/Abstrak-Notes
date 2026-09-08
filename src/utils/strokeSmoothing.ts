import { Point } from '../types/note';

/**
 * Calculates the Euclidean distance between two points.
 */
export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Calculates the midpoint between two points, including pressure interpolation.
 * Used for drawing smooth Quadratic Bezier curves between raw input points.
 */
export const getMidpoint = (p1: Point, p2: Point): Point => {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2,
    pressure: ((p1.pressure || 0.5) + (p2.pressure || 0.5)) / 2,
  };
};

/**
 * Drops points that are too close to each other.
 * This optimizes rendering performance and removes hardware micro-jitter.
 */
export const optimizePoints = (points: Point[], minDistance = 2): Point[] => {
  if (points.length < 2) return points;
  
  const optimized: Point[] = [points[0]];
  let lastPoint = points[0];

  for (let i = 1; i < points.length; i++) {
    const currentPoint = points[i];
    if (getDistance(lastPoint, currentPoint) > minDistance) {
      optimized.push(currentPoint);
      lastPoint = currentPoint;
    }
  }
  
  // Ensure the final point is always included to close the stroke
  if (lastPoint !== points[points.length - 1]) {
    optimized.push(points[points.length - 1]);
  }
  
  return optimized;
};

/**
 * Applies an Exponential Moving Average (EMA) to the pressure values.
 * This prevents sudden spikes or drops in stroke thickness if the stylus slips.
 */
export const smoothPressure = (points: Point[], alpha = 0.3): Point[] => {
  if (points.length === 0) return points;
  
  const smoothed: Point[] = [{ ...points[0] }];
  let lastPressure = points[0].pressure || 0.5;

  for (let i = 1; i < points.length; i++) {
    const currentPressure = points[i].pressure || 0.5;
    // EMA formula for smoothing time-series data
    const newPressure = (alpha * currentPressure) + ((1 - alpha) * lastPressure);
    
    smoothed.push({
      ...points[i],
      pressure: newPressure,
    });
    
    lastPressure = newPressure;
  }
  
  return smoothed;
};