import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Stage, Layer, Group, Rect, Image as KonvaImage } from 'react-konva';
import { DOC_WIDTH, DOC_HEIGHT } from './constants';
import {
  deepClone,
  clamp,
  makeId,
  getContainRect,
  getStylusConfig,
  normalizeSceneData,
  readFileAsDataUrl,
} from './utils';
import { ShapeRenderer } from './ShapeRenderer';

const MAX_HISTORY = 30;

const MemoShapeRenderer = memo(
  ShapeRenderer,
  (prev, next) => prev.shape === next.shape
);

function shallowCloneScene(scene) {
  return {
    ...scene,
    elements: scene.elements.slice(),
    meta: { ...(scene.meta || {}) },
  };
}

function AdvancedCanvas(
  {
    initialImage = '',
    initialData = null,
    tool = 'brush',
    brushType = 'chinese-brush',
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

  // History
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const snapshotRef = useRef(null);

  // Drawing
  const drawingRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const draftPointsRef = useRef([]);
  const rAFRef = useRef(null);

  // State
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scene, setScene] = useState(() => normalizeSceneData(initialImage, initialData));
  const [draftShape, setDraftShape] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

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
    const safeScene = shallowCloneScene(nextScene);

    snapshotRef.current = safeScene;
    setScene(safeScene);
    setDraftShape(null);

    historyRef.current = [safeScene];
    historyStepRef.current = 0;
    setHistoryStep(0);
    setHistoryLength(1);

    drawingRef.current = null;
    draftPointsRef.current = [];

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
  }, [initialImage, initialData]);

  useEffect(() => {
    let cancelled = false;

    if (!scene.backgroundSrc) {
      setBackgroundImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setBackgroundImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setBackgroundImage(null);
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

  useEffect(() => {
    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, []);

  const containRect = useMemo(() => {
    return getContainRect(displaySize.width, displaySize.height);
  }, [displaySize.width, displaySize.height]);

  const { scale, offsetX, offsetY } = containRect;

  const getDocPointFromClient = (clientX, clientY) => {
    const stage = stageRef.current;
    if (!stage || !scale) return null;

    const rect = stage.container().getBoundingClientRect();

    return {
      x: clamp((clientX - rect.left - offsetX) / scale, 0, DOC_WIDTH),
      y: clamp((clientY - rect.top - offsetY) / scale, 0, DOC_HEIGHT),
    };
  };

  const commitHistory = (nextScene) => {
    const safeScene = shallowCloneScene(nextScene);

    let nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);
    nextHistory.push(safeScene);

    if (nextHistory.length > MAX_HISTORY) {
      nextHistory = nextHistory.slice(nextHistory.length - MAX_HISTORY);
    }

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

    const safeScene = shallowCloneScene(item);

    historyStepRef.current = index;
    snapshotRef.current = safeScene;
    setScene(safeScene);
    setDraftShape(null);

    drawingRef.current = null;
    draftPointsRef.current = [];

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }

    setHistoryStep(index);
    setHistoryLength(historyRef.current.length);
  };

  const undo = () => {
    if (historyStepRef.current > 0) {
      restoreHistory(historyStepRef.current - 1);
    }
  };

  const redo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      restoreHistory(historyStepRef.current + 1);
    }
  };

  const clearCanvas = () => {
    const nextScene = {
      elements: [],
      backgroundSrc: '',
      meta: { inputMode, version: 1 },
    };

    drawingRef.current = null;
    draftPointsRef.current = [];
    setDraftShape(null);

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }

    commitHistory(nextScene);
  };

  const scheduleDraftRender = () => {
    if (rAFRef.current) return;

    rAFRef.current = requestAnimationFrame(() => {
      setDraftShape((prev) => {
        if (!prev) return prev;
        if (drawingRef.current?.kind !== 'freehand') return prev;

        return {
          ...prev,
          points: draftPointsRef.current,
        };
      });

      rAFRef.current = null;
    });
  };

  const appendFreehandPoint = (point, pressure, minDist) => {
    const points = draftPointsRef.current;
    const last = points[points.length - 1];

    if (last) {
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      if (dist < minDist) return false;
    }

    points.push({
      x: point.x,
      y: point.y,
      pressure,
    });

    return true;
  };

  const pushPointsFromPointerEvent = (evt, { force = false } = {}) => {
    const nativeEvents =
      typeof evt.getCoalescedEvents === 'function'
        ? evt.getCoalescedEvents()
        : [evt];

    const minDist = evt.pointerType === 'pen' ? 2.0 : 3.0;
    let changed = false;

    for (let i = 0; i < nativeEvents.length; i += 1) {
      const pe = nativeEvents[i];
      const point = getDocPointFromClient(pe.clientX, pe.clientY);
      if (!point) continue;

      const pressure =
        typeof pe.pressure === 'number' && pe.pressure > 0 ? pe.pressure : 0.5;

      if (force && i === nativeEvents.length - 1) {
        const points = draftPointsRef.current;
        const last = points[points.length - 1];

        if (!last || last.x !== point.x || last.y !== point.y) {
          points.push({ x: point.x, y: point.y, pressure });
          changed = true;
        }
        continue;
      }

      const didAppend = appendFreehandPoint(point, pressure, minDist);
      if (didAppend) changed = true;
    }

    return changed;
  };

  const beginStroke = (point, evt) => {
    const pressure =
      typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;

    const initialPoints = [
      { x: point.x, y: point.y, pressure },
      { x: point.x + 0.01, y: point.y + 0.01, pressure },
    ];

    draftPointsRef.current = initialPoints;

    const nextDraft = {
      id: makeId(),
      kind: 'freehand',
      tool,
      brushType,
      color,
      size,
      opacity,
      points: initialPoints,
    };

    drawingRef.current = { kind: 'freehand' };
    setDraftShape(nextDraft);
  };

  const handlePointerDown = (e) => {
    const evt = e.evt;
    if (evt.cancelable) evt.preventDefault();
    evt.stopPropagation();

    const stylus = getStylusConfig(evt, inputMode);
    if (!stylus.allow) return;

    const point = getDocPointFromClient(evt.clientX, evt.clientY);
    if (!point) return;

    if (tool === 'brush' || tool === 'eraser') {
      beginStroke(point, evt);
      return;
    }

    drawingRef.current = {
      kind: tool,
      startX: point.x,
      startY: point.y,
    };

    setDraftShape({
      id: makeId(),
      kind: tool,
      color,
      size,
      opacity,
      ...(tool === 'line' && { x1: point.x, y1: point.y, x2: point.x, y2: point.y }),
      ...(tool === 'rectangle' && { x: point.x, y: point.y, width: 0, height: 0 }),
      ...(tool === 'circle' && { x: point.x, y: point.y, radius: 0 }),
    });
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !draftShape) return;

    const evt = e.evt;
    if (evt.cancelable) evt.preventDefault();
    evt.stopPropagation();

    if (drawingRef.current.kind === 'freehand') {
      const changed = pushPointsFromPointerEvent(evt);
      if (changed) {
        scheduleDraftRender();
      }
      return;
    }

    const point = getDocPointFromClient(evt.clientX, evt.clientY);
    if (!point) return;

    setDraftShape((prev) => {
      if (!prev) return prev;

      if (drawingRef.current.kind === 'line') {
        return { ...prev, x2: point.x, y2: point.y };
      }

      if (drawingRef.current.kind === 'rectangle') {
        return {
          ...prev,
          width: point.x - prev.x,
          height: point.y - prev.y,
        };
      }

      if (drawingRef.current.kind === 'circle') {
        return {
          ...prev,
          radius: Math.hypot(point.x - prev.x, point.y - prev.y),
        };
      }

      return prev;
    });
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current || !draftShape) return;

    const evt = e.evt;
    if (evt.cancelable) evt.preventDefault();
    evt.stopPropagation();

    if (drawingRef.current.kind === 'freehand') {
      pushPointsFromPointerEvent(evt, { force: true });
    }

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }

    let finalShape = draftShape;

    if (drawingRef.current.kind === 'freehand') {
      finalShape = {
        ...draftShape,
        points: draftPointsRef.current.slice(),
      };
    }

    const nextScene = {
      ...snapshotRef.current,
      elements: snapshotRef.current.elements.concat(finalShape),
      meta: {
        ...(snapshotRef.current.meta || {}),
        inputMode,
        version: 1,
      },
    };

    drawingRef.current = null;
    draftPointsRef.current = [];
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
    draftPointsRef.current = [];
    setDraftShape(null);

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }

    commitHistory(nextScene);
  };

  const exportComposite = () => {
    const stage = stageRef.current;
    if (!stage || !displaySize.width || !displaySize.height || !scale) return '';

    const exportPixelRatio = 1 / scale;

    return stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: DOC_WIDTH * scale,
      height: DOC_HEIGHT * scale,
      pixelRatio: exportPixelRatio,
    });
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
    toDataURL: exportComposite,
    getSceneData: () => deepClone(snapshotRef.current),
    undo,
    redo,
    clear: clearCanvas,
    importImageFile,
    exportImage,
  }));

  const imageLayout = useMemo(() => {
    if (!backgroundImage) return null;

    const width = backgroundImage.width || DOC_WIDTH;
    const height = backgroundImage.height || DOC_HEIGHT;
    const fitScale = Math.min(DOC_WIDTH / width, DOC_HEIGHT / height);

    return {
      x: (DOC_WIDTH - width * fitScale) / 2,
      y: (DOC_HEIGHT - height * fitScale) / 2,
      width: width * fitScale,
      height: height * fitScale,
    };
  }, [backgroundImage]);

  return (
    <div
      ref={containerRef}
      className="flex max-h-full min-h-0 min-w-0 overflow-hidden rounded-[inherit] bg-white mx-auto select-none"
      style={{
        touchAction: 'none',
        aspectRatio: '9 / 16',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
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
            <Layer listening={false}>
              <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
                <Rect
                  x={0}
                  y={0}
                  width={DOC_WIDTH}
                  height={DOC_HEIGHT}
                  fill={backgroundColor}
                />
                {backgroundImage && imageLayout && (
                  <KonvaImage
                    image={backgroundImage}
                    x={imageLayout.x}
                    y={imageLayout.y}
                    width={imageLayout.width}
                    height={imageLayout.height}
                  />
                )}
              </Group>
            </Layer>

            <Layer>
              <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
                {scene.elements.map((shape) => (
                  <MemoShapeRenderer key={shape.id} shape={shape} />
                ))}
                {draftShape && <MemoShapeRenderer shape={draftShape} />}
              </Group>
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);