import { getStroke } from 'perfect-freehand';
import { average, normalizePoint } from './utils';

export const getBrushStrokeOptions = (brushType, currentSize, isComplete = false) => {
  switch (brushType) {
    case 'chinese-brush':
      return {
        size: currentSize * 1.2,
        thinning: 0.6,
        smoothing: 0.65,
        streamline: 0.4,
        simulatePressure: true,
        last: isComplete,
        start: { taper: currentSize * 0.2, cap: true },
        end: { taper: currentSize * 0.8, cap: true },
      };
    case 'pen':
      return { size: currentSize, thinning: 0.58, smoothing: 0.68, streamline: 0.4, simulatePressure: false, last: isComplete };
    case 'pencil':
      return { size: Math.max(1, currentSize * 0.92), thinning: 0.18, smoothing: 0.38, streamline: 0.18, simulatePressure: false, last: isComplete, start: { taper: currentSize * 0.3, cap: true }, end: { taper: currentSize * 0.5, cap: true } };
    case 'marker':
      return { size: currentSize * 1.45, thinning: 0.04, smoothing: 0.8, streamline: 0.56, simulatePressure: false, last: isComplete };
    case 'calligraphy':
      return { size: currentSize * 1.08, thinning: -0.12, smoothing: 0.82, streamline: 0.6, simulatePressure: false, last: isComplete, start: { taper: currentSize * 0.7, cap: true }, end: { taper: currentSize * 1.05, cap: true } };
    default:
      return { size: currentSize, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: false, last: isComplete };
  }
};

export const getStrokePathData = (inputPoints, brushType, size) => {
  if (!inputPoints?.length) return '';

  const pts = inputPoints.map((point) => {
    const p = normalizePoint(point);
    return [p.x, p.y, p.pressure];
  });

  const outline = getStroke(pts, getBrushStrokeOptions(brushType, size, true));

  if (!outline.length) return '';

  const [first, ...rest] = outline;
  let d = `M ${first[0]} ${first[1]}`;

  for (let i = 0; i < rest.length; i += 1) {
    const curr = rest[i];
    const next = rest[(i + 1) % rest.length] || first;
    d += ` Q ${curr[0]} ${curr[1]} ${average(curr[0], next[0])} ${average(curr[1], next[1])}`;
  }

  d += ' Z';
  return d;
};