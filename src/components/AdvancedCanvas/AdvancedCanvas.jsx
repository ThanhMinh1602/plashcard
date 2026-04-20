import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Stage, Layer, Group, Rect, Line, Circle, Image as KonvaImage } from 'react-konva';

const DOC_WIDTH = 900;
const DOC_HEIGHT = 1200;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const makeId = () =>
  `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

const getBrushStyle = (brushType, baseSize, baseOpacity, color, tool) => {
  const isEraser = tool === 'eraser';

  if (isEraser) {
    return {
      stroke: '#000000',
      strokeWidth: Math.max(6, baseSize * 1.25),
      opacity: 1,
      tension: 0.12,
      compositeOperation: 'destination-out',
    };
  }

  switch (brushType) {
    case 'pencil':
      return {
        stroke: color,
        strokeWidth: Math.max(1, baseSize * 0.95),
        opacity: Math.min(1, baseOpacity * 0.62),
        tension: 0.08,
        compositeOperation: 'source-over',
      };

    case 'marker':
      return {
        stroke: color,
        strokeWidth: Math.max(2, baseSize * 1.45),
        opacity: Math.min(1, baseOpacity * 0.34),
        tension: 0.2,
        compositeOperation: 'source-over',
      };

    case 'calligraphy':
      return {
        stroke: color,
        strokeWidth: Math.max(2, baseSize * 1.12),
        opacity: baseOpacity,
        tension: 0.18,
        compositeOperation: 'source-over',
      };

    case 'pen':
    default:
      return {
        stroke: color,
        strokeWidth: Math.max(1, baseSize),
        opacity: baseOpacity,
        tension: 0.16,
        compositeOperation: 'source-over',
      };
  }
};

function AdvancedCanvas(
  {
    initialImage = '',
    tool = 'brush',
    brushType = 'pen',
    color = '#000000',
    size = 4,
    opacity = 1,
    backgroundColor = '#ffffff',
    onStatusChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const docGroupRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const onStatusChangeRef = useRef(onStatusChange);
  const initializedRef = useRef(false);
  const drawingRef = useRef(null);
  const snapshotRef = useRef({
    elements: [],
    backgroundSrc: initialImage || '',
  });

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [snapshot, setSnapshot] = useState({
    elements: [],
    backgroundSrc: initialImage || '',
  });
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [draftShape, setDraftShape] = useState(null);
  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

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
    let cancelled = false;

    if (!snapshot.backgroundSrc) {
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
    img.src = snapshot.backgroundSrc;

    return () => {
      cancelled = true;
    };
  }, [snapshot.backgroundSrc]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialSnapshot = deepClone({
      elements: [],
      backgroundSrc: initialImage || '',
    });

    snapshotRef.current = initialSnapshot;
    setSnapshot(initialSnapshot);
    historyRef.current = [initialSnapshot];
    historyStepRef.current = 0;
    setHistoryStep(0);
    setHistoryLength(1);
  }, [initialImage]);

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

  const commitHistory = (nextSnapshot) => {
    const safeSnapshot = deepClone(nextSnapshot);
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);

    nextHistory.push(safeSnapshot);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;

    snapshotRef.current = safeSnapshot;
    setSnapshot(safeSnapshot);
    setHistoryStep(historyStepRef.current);
    setHistoryLength(nextHistory.length);
  };

  const restoreHistory = (nextIndex) => {
    const item = historyRef.current[nextIndex];
    if (!item) return;

    const safeSnapshot = deepClone(item);
    historyStepRef.current = nextIndex;
    snapshotRef.current = safeSnapshot;
    setSnapshot(safeSnapshot);
    setDraftShape(null);
    setHistoryStep(nextIndex);
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
    const nextSnapshot = {
      elements: [],
      backgroundSrc: '',
    };
    setDraftShape(null);
    commitHistory(nextSnapshot);
  };

  const getDocPointFromStage = () => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const { scale, offsetX, offsetY } = getContainRect(
      displaySize.width,
      displaySize.height
    );

    const x = clamp((pos.x - offsetX) / scale, 0, DOC_WIDTH);
    const y = clamp((pos.y - offsetY) / scale, 0, DOC_HEIGHT);

    return { x, y };
  };

  const shouldStartDrawing = (konvaEvent) => {
    const evt = konvaEvent?.evt;
    if (!evt) return false;

    if (typeof evt.isPrimary === 'boolean' && !evt.isPrimary) {
      return false;
    }

    if (evt.pointerType === 'mouse' && evt.button !== 0) {
      return false;
    }

    // Tối ưu cho iPad + bút: bỏ finger draw để tránh chạm nhầm bằng tay.
    // Pen và mouse vẫn hoạt động.
    if (evt.pointerType === 'touch') {
      return false;
    }

    return true;
  };

  const handlePointerDown = (e) => {
    if (!shouldStartDrawing(e)) return;

    const point = getDocPointFromStage();
    if (!point) return;

    const evt = e.evt;
    if (evt.cancelable) evt.preventDefault();

    if (tool === 'brush' || tool === 'eraser') {
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
        points: [point.x, point.y, point.x + 0.01, point.y + 0.01],
        pressures: [pressure],
      };

      drawingRef.current = {
        kind: 'freehand',
      };
      setDraftShape(nextDraft);
      return;
    }

    if (tool === 'line') {
      const nextDraft = {
        id: makeId(),
        kind: 'line',
        color,
        size,
        opacity,
        points: [point.x, point.y, point.x, point.y],
      };

      drawingRef.current = {
        kind: 'line',
        startX: point.x,
        startY: point.y,
      };
      setDraftShape(nextDraft);
      return;
    }

    if (tool === 'rectangle') {
      const nextDraft = {
        id: makeId(),
        kind: 'rectangle',
        color,
        size,
        opacity,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      };

      drawingRef.current = {
        kind: 'rectangle',
        startX: point.x,
        startY: point.y,
      };
      setDraftShape(nextDraft);
      return;
    }

    if (tool === 'circle') {
      const nextDraft = {
        id: makeId(),
        kind: 'circle',
        color,
        size,
        opacity,
        x: point.x,
        y: point.y,
        radius: 0,
      };

      drawingRef.current = {
        kind: 'circle',
        startX: point.x,
        startY: point.y,
      };
      setDraftShape(nextDraft);
    }
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !draftShape) return;

    const point = getDocPointFromStage();
    if (!point) return;

    const evt = e.evt;
    if (evt.cancelable) evt.preventDefault();

    if (drawingRef.current.kind === 'freehand') {
      const pressure =
        typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;

      setDraftShape((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [...prev.points, point.x, point.y],
          pressures: [...(prev.pressures || []), pressure],
        };
      });
      return;
    }

    if (drawingRef.current.kind === 'line') {
      setDraftShape((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [
            drawingRef.current.startX,
            drawingRef.current.startY,
            point.x,
            point.y,
          ],
        };
      });
      return;
    }

    if (drawingRef.current.kind === 'rectangle') {
      setDraftShape((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          x: drawingRef.current.startX,
          y: drawingRef.current.startY,
          width: point.x - drawingRef.current.startX,
          height: point.y - drawingRef.current.startY,
        };
      });
      return;
    }

    if (drawingRef.current.kind === 'circle') {
      const radius = Math.sqrt(
        Math.pow(point.x - drawingRef.current.startX, 2) +
          Math.pow(point.y - drawingRef.current.startY, 2)
      );

      setDraftShape((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          x: drawingRef.current.startX,
          y: drawingRef.current.startY,
          radius,
        };
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current || !draftShape) return;

    const evt = e.evt;
    if (evt?.cancelable) evt.preventDefault();

    const nextSnapshot = {
      ...snapshotRef.current,
      elements: [...snapshotRef.current.elements, deepClone(draftShape)],
    };

    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextSnapshot);
  };

  const importImageFile = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);

    const nextSnapshot = {
      ...snapshotRef.current,
      backgroundSrc: dataUrl,
    };

    setDraftShape(null);
    commitHistory(nextSnapshot);
  };

  const exportComposite = () => {
    const group = docGroupRef.current;
    if (!group || !displaySize.width || !displaySize.height) {
      return '';
    }

    const { drawWidth } = getContainRect(displaySize.width, displaySize.height);
    const pixelRatio = drawWidth ? DOC_WIDTH / drawWidth : 1;

    return group.toDataURL({
      pixelRatio,
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
    toDataURL: () => exportComposite(),
    undo,
    redo,
    clear: clearCanvas,
    importImageFile,
    exportImage,
  }));

  const renderShape = (shape) => {
    if (!shape) return null;

    if (shape.kind === 'freehand') {
      const brush = getBrushStyle(
        shape.brushType,
        shape.size,
        shape.opacity,
        shape.color,
        shape.tool
      );

      return (
        <Line
          key={shape.id}
          points={shape.points}
          stroke={brush.stroke}
          strokeWidth={brush.strokeWidth}
          opacity={brush.opacity}
          lineCap="round"
          lineJoin="round"
          tension={brush.tension}
          globalCompositeOperation={brush.compositeOperation}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    if (shape.kind === 'line') {
      return (
        <Line
          key={shape.id}
          points={shape.points}
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
  };

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
            onPointerdown={handlePointerDown}
            onPointermove={handlePointerMove}
            onPointerup={handlePointerUp}
            onPointercancel={handlePointerUp}
            onContextMenu={(e) => e.evt.preventDefault()}
          >
            <Layer>
              <Group
                ref={docGroupRef}
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

                {snapshot.elements.map((shape) => renderShape(shape))}
                {draftShape ? renderShape(draftShape) : null}
              </Group>
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);