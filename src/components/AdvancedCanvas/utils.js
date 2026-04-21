import { DOC_WIDTH, DOC_HEIGHT } from './constants';

export const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const makeId = () =>
  `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const average = (a, b) => (a + b) / 2;

export const normalizePoint = (point) => {
  if (!point) return { x: 0, y: 0, pressure: 0.5 };
  if (Array.isArray(point)) {
    return {
      x: Number(point[0]) || 0,
      y: Number(point[1]) || 0,
      pressure: Number(point[2]) || 0.5,
    };
  }
  return {
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    pressure: Number(point.pressure) || 0.5,
  };
};

export const getContainRect = (displayWidth, displayHeight) => {
  if (!displayWidth || !displayHeight) {
    return { scale: 1, drawWidth: 0, drawHeight: 0, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(displayWidth / DOC_WIDTH, displayHeight / DOC_HEIGHT);
  const drawWidth = DOC_WIDTH * scale;
  const drawHeight = DOC_HEIGHT * scale;
  const offsetX = (displayWidth - drawWidth) / 2;
  const offsetY = (displayHeight - drawHeight) / 2;

  return { scale, drawWidth, drawHeight, offsetX, offsetY };
};

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const normalizeSceneData = (initialImage, initialData) => {
  if (initialData && typeof initialData === 'object') {
    return {
      elements: Array.isArray(initialData.elements)
        ? initialData.elements.map((item) => ({
            ...item,
            points: Array.isArray(item.points) ? item.points.map(normalizePoint) : [],
          }))
        : [],
      backgroundSrc: initialData.backgroundSrc || initialImage || '',
      meta: initialData.meta || {},
    };
  }

  if (typeof initialData === 'string' && initialData.trim()) {
    try {
      const parsed = JSON.parse(initialData);
      return normalizeSceneData(initialImage, parsed);
    } catch {
      return { elements: [], backgroundSrc: initialImage || '', meta: {} };
    }
  }

  return { elements: [], backgroundSrc: initialImage || '', meta: {} };
};

export const getStylusConfig = (evt, inputMode) => {
  const pointerType = evt?.pointerType || 'mouse';
  const isPen = pointerType === 'pen';
  const isTouch = pointerType === 'touch';
  const isMouse = pointerType === 'mouse';

  if (typeof evt?.isPrimary === 'boolean' && !evt.isPrimary) {
    return { allow: false, reason: 'not-primary' };
  }
  if (isTouch) {
    return { allow: false, reason: 'touch-blocked' };
  }
  if (isMouse && evt.button !== 0) {
    return { allow: false, reason: 'mouse-button' };
  }
  if (inputMode === 'stylusOnly') {
    if (isPen) return { allow: true, mode: 'pen' };
    if (isMouse) return { allow: true, mode: 'mouse-dev' };
    return { allow: false, reason: 'not-stylus' };
  }
  return { allow: true, mode: pointerType };
};