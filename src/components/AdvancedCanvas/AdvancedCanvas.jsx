import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Stage,
  Layer,
  Group,
  Rect,
  Line,
  Circle,
  Path,
  Image as KonvaImage,
} from 'react-konva';
import { getStroke } from 'perfect-freehand';

const DOC_WIDTH = 900;
const DOC_HEIGHT = 1200;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const makeId = () =>
  `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const average = (a, b) => (a + b) / 2;

const normalizePoint = (point) => {
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

const getContainRect = (displayWidth, displayHeight) => {
  if (!displayWidth || !displayHeight) {
    return {
      scale: 1,
      drawWidth: 0,
      drawHeight: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const scale = Math.min(displayWidth / DOC_WIDTH, displayHeight / DOC_HEIGHT);
  const drawWidth = DOC_WIDTH * scale;
  const drawHeight = DOC_HEIGHT * scale;
  const offsetX = (displayWidth - drawWidth) / 2;
  const offsetY = (displayHeight - drawHeight) / 2;

  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
  };
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getBrushStrokeOptions = (brushType, currentSize, isComplete = false) => {
  switch (brushType) {
    case 'pen':
      return {
        size: currentSize,
        thinning: 0.58,
        smoothing: 0.68,
        streamline: 0.4,
        simulatePressure: false,
        last: isComplete,
      };

    case 'pencil':
      return {
        size: Math.max(1, currentSize * 0.92),
        thinning: 0.18,
        smoothing: 0.38,
        streamline: 0.18,
        simulatePressure: false,
        last: isComplete,
        start: { taper: currentSize * 0.3, cap: true },
        end: { taper: currentSize * 0.5, cap: true },
      };

    case 'marker':
      return {
        size: currentSize * 1.45,
        thinning: 0.04,
        smoothing: 0.8,
        streamline: 0.56,
        simulatePressure: false,
        last: isComplete,
      };

    case 'calligraphy':
      return {
        size: currentSize * 1.08,
        thinning: -0.12,
        smoothing: 0.82,
        streamline: 0.6,
        simulatePressure: false,
        last: isComplete,
        start: { taper: currentSize * 0.7, cap: true },
        end: { taper: currentSize * 1.05, cap: true },
      };

    default:
      return {
        size: currentSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
        last: isComplete,
      };
  }
};

const getStrokePathData = (inputPoints, brushType, size) => {
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
    d += ` Q ${curr[0]} ${curr[1]} ${average(curr[0], next[0])} ${average(
      curr[1],
      next[1]
    )}`;
  }

  d += ' Z';
  return d;
};

const normalizeSceneData = (initialImage, initialData) => {
  if (initialData && typeof initialData === 'object') {
    return {
      elements: Array.isArray(initialData.elements)
        ? initialData.elements.map((item) => ({
            ...item,
            points: Array.isArray(item.points)
              ? item.points.map(normalizePoint)
              : [],
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
      return {
        elements: [],
        backgroundSrc: initialImage || '',
        meta: {},
      };
    }
  }

  return {
    elements: [],
    backgroundSrc: initialImage || '',
    meta: {},
  };
};

const getStylusConfig = (evt, inputMode) => {
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

function renderSceneShape(shape) {
  if (!shape) return null;

  if (shape.kind === 'freehand') {
    const pathData = getStrokePathData(
      shape.points,
      shape.brushType || 'pen',
      shape.size || 4
    );

    if (!pathData) return null;

    const isEraser = shape.tool === 'eraser';

    let fillOpacity = shape.opacity ?? 1;
    if (!isEraser && shape.brushType === 'pencil') {
      fillOpacity = Math.min(1, fillOpacity * 0.58);
    }
    if (!isEraser && shape.brushType === 'marker') {
      fillOpacity = Math.min(1, fillOpacity * 0.32);
    }

    return (
      <Path
        key={shape.id}
        data={pathData}
        fill={isEraser ? '#000000' : shape.color}
        opacity={isEraser ? 1 : fillOpacity}
        globalCompositeOperation={
          isEraser ? 'destination-out' : 'source-over'
        }
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'line') {
    return (
      <Line
        key={shape.id}
        points={[
          shape.x1 || 0,
          shape.y1 || 0,
          shape.x2 || 0,
          shape.y2 || 0,
        ]}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'rectangle') {
    return (
      <Rect
        key={shape.id}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'circle') {
    return (
      <Circle
        key={shape.id}
        x={shape.x}
        y={shape.y}
        radius={shape.radius}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return null;
}

function AdvancedCanvas(
  {
    initialImage = '',
    initialData = null,
    tool = 'brush',
    brushType = 'pen',
    color = '#000000',
    size = 4,
    opacity = 1,
    backgroundColor = '#ffffff',
    inputMode = 'stylusOnly',
    onStatusChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const exportGroupRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const drawingRef = useRef(null);
  const snapshotRef = useRef(null);
  const draftShapeRef = useRef(null);
const rafRenderRef = useRef(null);
const liveVersionRef = useRef(0);
  const onStatusChangeRef = useRef(onStatusChange);

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scene, setScene] = useState(() =>
    normalizeSceneData(initialImage, initialData)
  );
  const [draftShape, setDraftShape] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [, forceFrame] = useState(0);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onStatusChangeRef.current?.({
      canUndo: historyStep > 0,
      canRedo: historyStep < historyLength - 1,
    });
  }, [historyStep, historyLength]);

  useEffect(() => {
    const nextScene = normalizeSceneData(initialImage, initialData);
    snapshotRef.current = nextScene;
    setScene(nextScene);
    setDraftShape(null);
    historyRef.current = [deepClone(nextScene)];
    historyStepRef.current = 0;
    setHistoryStep(0);
    setHistoryLength(1);
  }, [initialImage, initialData]);

  useEffect(() => {
    snapshotRef.current = scene;
  }, [scene]);

  useEffect(() => {
    let cancelled = false;

    if (!scene.backgroundSrc) {
      setBackgroundImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) {
        setBackgroundImage(img);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setBackgroundImage(null);
      }
    };
    img.src = scene.backgroundSrc;

    return () => {
      cancelled = true;
    };
  }, [scene.backgroundSrc]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      setDisplaySize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const getDocPointFromStage = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const { scale, offsetX, offsetY } = getContainRect(
      displaySize.width,
      displaySize.height
    );

    if (!scale) return null;

    return {
      x: clamp((pos.x - offsetX) / scale, 0, DOC_WIDTH),
      y: clamp((pos.y - offsetY) / scale, 0, DOC_HEIGHT),
    };
  };

  const commitHistory = (nextScene) => {
    const safeScene = deepClone(nextScene);
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);

    nextHistory.push(safeScene);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;

    snapshotRef.current = safeScene;
    setScene(safeScene);
    setHistoryStep(historyStepRef.current);
    setHistoryLength(nextHistory.length);
  };

  const restoreHistory = (index) => {
    const item = historyRef.current[index];
    if (!item) return;

    const safeScene = deepClone(item);
    historyStepRef.current = index;
    snapshotRef.current = safeScene;
    setScene(safeScene);
    setDraftShape(null);
    setHistoryStep(index);
    setHistoryLength(historyRef.current.length);
  };

  const undo = () => {
    if (historyStepRef.current <= 0) return;
    restoreHistory(historyStepRef.current - 1);
  };

  const redo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;
    restoreHistory(historyStepRef.current + 1);
  };

  const clearCanvas = () => {
    const nextScene = {
      elements: [],
      backgroundSrc: '',
      meta: {
        inputMode,
        version: 1,
      },
    };
    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  const beginStroke = (point, evt) => {
    const pressure =
      typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;

    const nextDraft = {
      id: makeId(),
      kind: 'freehand',
      tool,
      brushType,
      color,
      size,
      opacity,
      points: [
        { x: point.x, y: point.y, pressure },
        { x: point.x + 0.01, y: point.y + 0.01, pressure },
      ],
    };

    drawingRef.current = { kind: 'freehand' };
    setDraftShape(nextDraft);
  };

  const handlePointerDown = (e) => {
    const evt = e.evt;
    const stylus = getStylusConfig(evt, inputMode);

    if (!stylus.allow) return;

    const point = getDocPointFromStage();
    if (!point) return;

    if (evt.cancelable) evt.preventDefault();

    if (tool === 'brush' || tool === 'eraser') {
      beginStroke(point, evt);
      return;
    }

    if (tool === 'line') {
      drawingRef.current = {
        kind: 'line',
        startX: point.x,
        startY: point.y,
      };

      setDraftShape({
        id: makeId(),
        kind: 'line',
        color,
        size,
        opacity,
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
      });
      return;
    }

    if (tool === 'rectangle') {
      drawingRef.current = {
        kind: 'rectangle',
        startX: point.x,
        startY: point.y,
      };

      setDraftShape({
        id: makeId(),
        kind: 'rectangle',
        color,
        size,
        opacity,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
      return;
    }

    if (tool === 'circle') {
      drawingRef.current = {
        kind: 'circle',
        startX: point.x,
        startY: point.y,
      };

      setDraftShape({
        id: makeId(),
        kind: 'circle',
        color,
        size,
        opacity,
        x: point.x,
        y: point.y,
        radius: 0,
      });
    }
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !draftShape) return;

    const evt = e.evt;
    const point = getDocPointFromStage();
    if (!point) return;

    if (evt.cancelable) evt.preventDefault();

    if (drawingRef.current.kind === 'freehand') {
      const pressure =
        typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;

      setDraftShape((prev) => {
        if (!prev) return prev;

        const lastPoint = prev.points[prev.points.length - 1];
        const dx = point.x - lastPoint.x;
        const dy = point.y - lastPoint.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.4) return prev;

        return {
          ...prev,
          points: [...prev.points, { x: point.x, y: point.y, pressure }],
        };
      });
      return;
    }

    if (drawingRef.current.kind === 'line') {
      setDraftShape((prev) =>
        prev
          ? {
              ...prev,
              x2: point.x,
              y2: point.y,
            }
          : prev
      );
      return;
    }

    if (drawingRef.current.kind === 'rectangle') {
      setDraftShape((prev) =>
        prev
          ? {
              ...prev,
              x: drawingRef.current.startX,
              y: drawingRef.current.startY,
              width: point.x - drawingRef.current.startX,
              height: point.y - drawingRef.current.startY,
            }
          : prev
      );
      return;
    }

    if (drawingRef.current.kind === 'circle') {
      const radius = Math.sqrt(
        Math.pow(point.x - drawingRef.current.startX, 2) +
          Math.pow(point.y - drawingRef.current.startY, 2)
      );

      setDraftShape((prev) =>
        prev
          ? {
              ...prev,
              radius,
            }
          : prev
      );
    }
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current || !draftShape) return;

    if (e.evt?.cancelable) {
      e.evt.preventDefault();
    }

    const nextScene = {
      ...snapshotRef.current,
      elements: [...snapshotRef.current.elements, deepClone(draftShape)],
      meta: {
        ...(snapshotRef.current.meta || {}),
        inputMode,
        version: 1,
      },
    };

    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  const importImageFile = async (file) => {
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);

    const nextScene = {
      ...snapshotRef.current,
      backgroundSrc: dataUrl,
      meta: {
        ...(snapshotRef.current.meta || {}),
        inputMode,
        version: 1,
      },
    };

    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  const getSceneData = () => deepClone(snapshotRef.current);

  const exportComposite = () => {
    const group = exportGroupRef.current;
    if (!group || !displaySize.width || !displaySize.height) {
      return '';
    }

    const { drawWidth } = getContainRect(displaySize.width, displaySize.height);
    const pixelRatio = drawWidth ? DOC_WIDTH / drawWidth : 1;

    return group.toDataURL({ pixelRatio });
  };

  const exportImage = () => {
    const dataUrl = exportComposite();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = 'flashcard-face.png';
    link.href = dataUrl;
    link.click();
  };

  useImperativeHandle(ref, () => ({
    toDataURL: () => exportComposite(),
    getSceneData,
    undo,
    redo,
    clear: clearCanvas,
    importImageFile,
    exportImage,
  }));

  const { scale, offsetX, offsetY } = getContainRect(
    displaySize.width,
    displaySize.height
  );

  const imageLayout = (() => {
    if (!backgroundImage) return null;

    const imageWidth = backgroundImage.width || DOC_WIDTH;
    const imageHeight = backgroundImage.height || DOC_HEIGHT;
    const fitScale = Math.min(DOC_WIDTH / imageWidth, DOC_HEIGHT / imageHeight);
    const width = imageWidth * fitScale;
    const height = imageHeight * fitScale;

    return {
      x: (DOC_WIDTH - width) / 2,
      y: (DOC_HEIGHT - height) / 2,
      width,
      height,
    };
  })();

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full min-h-0 min-w-0 overflow-hidden rounded-[inherit] bg-white"
      style={{ touchAction: 'none' }}
    >
      <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden rounded-[inherit] bg-white">
        {displaySize.width > 0 && displaySize.height > 0 && (
          <Stage
            ref={stageRef}
            width={displaySize.width}
            height={displaySize.height}
            className="h-full w-full bg-white"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.evt.preventDefault()}
          >
            <Layer>
              <Group
                ref={exportGroupRef}
                x={offsetX}
                y={offsetY}
                scaleX={scale}
                scaleY={scale}
              >
                <Rect
                  x={0}
                  y={0}
                  width={DOC_WIDTH}
                  height={DOC_HEIGHT}
                  fill={backgroundColor}
                  listening={false}
                />

                {backgroundImage && imageLayout ? (
                  <KonvaImage
                    image={backgroundImage}
                    x={imageLayout.x}
                    y={imageLayout.y}
                    width={imageLayout.width}
                    height={imageLayout.height}
                    listening={false}
                  />
                ) : null}

                {scene.elements.map((shape) => renderSceneShape(shape))}
                {draftShape ? renderSceneShape(draftShape) : null}
              </Group>
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);