import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getStroke } from 'perfect-freehand';
import './AdvancedCanvas.css';

const DOC_WIDTH = 900;
const DOC_HEIGHT = 1200;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function AdvancedCanvas(
  {
    initialImage = '',
    tool = 'brush',
    brushType = 'pen',
    color = '#000000',
    size = 4,
    opacity = 1,
    onStatusChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const viewCanvasRef = useRef(null);
  const contentCanvasRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);


  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const interactionRef = useRef(null);
const docSizeRef = useRef({ width: DOC_WIDTH, height: DOC_HEIGHT });

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

  const createOffscreenCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);

    return canvas;
  };

  const getContentCanvas = () => contentCanvasRef.current;

  const getPointerPressure = (e) => {
    const p = typeof e?.pressure === 'number' ? e.pressure : 0.5;
    return p > 0 ? p : 0.5;
  };

  const loadImageToCanvas = (canvas, src, mode = 'stretch') =>
    new Promise((resolve) => {
      if (!src || !canvas) {
        resolve();
        return;
      }

      const img = new Image();

      img.onload = () => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (mode === 'contain') {
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const dx = (canvas.width - drawWidth) / 2;
          const dy = (canvas.height - drawHeight) / 2;
          ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        resolve();
      };

      img.onerror = () => resolve();
      img.src = src;
    });

  const buildExportCanvas = () => {
    const { width, height } = docSizeRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const contentCanvas = getContentCanvas();
    if (contentCanvas) {
      ctx.drawImage(contentCanvas, 0, 0, width, height);
    }

    return exportCanvas;
  };

  const exportComposite = () => buildExportCanvas().toDataURL('image/png');

  const getClientPoint = (e) => {
    const source =
      e?.nativeEvent?.changedTouches?.[0] ||
      e?.changedTouches?.[0] ||
      e?.nativeEvent?.touches?.[0] ||
      e?.touches?.[0] ||
      e;

    return {
      clientX: source?.clientX ?? 0,
      clientY: source?.clientY ?? 0,
    };
  };

  const getContainRect = () => {
    const { width: docWidth, height: docHeight } = docSizeRef.current;
    const { width: displayWidth, height: displayHeight } = displaySize;

    if (!docWidth || !docHeight || !displayWidth || !displayHeight) {
      return {
        scale: 1,
        drawWidth: 0,
        drawHeight: 0,
        offsetX: 0,
        offsetY: 0,
      };
    }

    const scale = Math.min(displayWidth / docWidth, displayHeight / docHeight);
    const drawWidth = docWidth * scale;
    const drawHeight = docHeight * scale;
    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    return { scale, drawWidth, drawHeight, offsetX, offsetY };
  };

  const toDocPoint = (e) => {
    const canvas = viewCanvasRef.current;
    const { width: docWidth, height: docHeight } = docSizeRef.current;

    if (
      !canvas ||
      !docWidth ||
      !docHeight ||
      !displaySize.width ||
      !displaySize.height
    ) {
      return { x: 0, y: 0, clientX: 0, clientY: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getClientPoint(e);
    const { drawWidth, drawHeight, offsetX, offsetY } = getContainRect();

    if (!drawWidth || !drawHeight) {
      return { x: 0, y: 0, clientX, clientY };
    }

    const localX = clientX - rect.left - offsetX;
    const localY = clientY - rect.top - offsetY;

    const rx = clamp(localX / drawWidth, 0, 1);
    const ry = clamp(localY / drawHeight, 0, 1);

    return {
      x: rx * docWidth,
      y: ry * docHeight,
      clientX,
      clientY,
    };
  };

  const docToDisplayPoint = (point) => {
    const { scale, offsetX, offsetY } = getContainRect();

    return {
      x: offsetX + point.x * scale,
      y: offsetY + point.y * scale,
    };
  };

  const releasePointer = () => {
    const pointerId = activePointerIdRef.current;

    if (pointerId != null) {
      try {
        viewCanvasRef.current?.releasePointerCapture?.(pointerId);
      } catch {
        // ignore
      }
    }

    activePointerIdRef.current = null;
  };

  const buildSnapshot = () => ({
    dataUrl: getContentCanvas()?.toDataURL('image/png') || '',
  });

  const commitHistory = () => {
    const snapshot = buildSnapshot();
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);

    nextHistory.push(snapshot);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;

    setHistoryLength(nextHistory.length);
    setHistoryStep(historyStepRef.current);
  };

  const restoreSnapshot = async (snapshot) => {
    const contentCanvas = createOffscreenCanvas(
      docSizeRef.current.width,
      docSizeRef.current.height
    );

    await loadImageToCanvas(contentCanvas, snapshot.dataUrl, 'stretch');
    contentCanvasRef.current = contentCanvas;

    requestAnimationFrame(() => {
      renderCanvas();
    });
  };

  const undo = async () => {
    if (historyStepRef.current <= 0) return;
    historyStepRef.current -= 1;
    setHistoryStep(historyStepRef.current);
    await restoreSnapshot(historyRef.current[historyStepRef.current]);
  };

  const redo = async () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;
    historyStepRef.current += 1;
    setHistoryStep(historyStepRef.current);
    await restoreSnapshot(historyRef.current[historyStepRef.current]);
  };

  const getBrushStrokeOptions = (currentBrushType, currentSize, isComplete = false) => {
    switch (currentBrushType) {
      case 'pen':
        return {
          size: currentSize,
          thinning: 0.55,
          smoothing: 0.62,
          streamline: 0.42,
          simulatePressure: false,
          last: isComplete,
        };

      case 'pencil':
        return {
          size: Math.max(1, currentSize * 0.9),
          thinning: 0.2,
          smoothing: 0.35,
          streamline: 0.18,
          simulatePressure: false,
          last: isComplete,
          start: { taper: currentSize * 0.4, cap: true },
          end: { taper: currentSize * 0.6, cap: true },
        };

      case 'marker':
        return {
          size: currentSize * 1.45,
          thinning: 0.08,
          smoothing: 0.72,
          streamline: 0.55,
          simulatePressure: false,
          last: isComplete,
        };

      case 'calligraphy':
        return {
          size: currentSize * 1.08,
          thinning: -0.12,
          smoothing: 0.78,
          streamline: 0.6,
          simulatePressure: false,
          last: isComplete,
          start: { taper: currentSize * 0.8, cap: true },
          end: { taper: currentSize * 1.2, cap: true },
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

  const buildStrokePath = (outlinePoints) => {
    const path = new Path2D();

    if (!outlinePoints?.length) return path;

    path.moveTo(outlinePoints[0][0], outlinePoints[0][1]);

    for (let i = 1; i < outlinePoints.length; i += 1) {
      path.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
    }

    path.closePath();
    return path;
  };

  const drawPerfectFreehandStroke = ({
    ctx,
    points,
    currentBrushType,
    currentColor,
    currentOpacity,
    currentSize,
    isComplete,
  }) => {
    if (!points?.length) return;

    const outline = getStroke(
      points,
      getBrushStrokeOptions(currentBrushType, currentSize, isComplete)
    );

    if (!outline.length) return;

    const path = buildStrokePath(outline);

    ctx.save();

    if (currentBrushType === 'pencil') {
      ctx.globalAlpha = currentOpacity * 0.55;
    } else if (currentBrushType === 'marker') {
      ctx.globalAlpha = currentOpacity * 0.28;
    } else {
      ctx.globalAlpha = currentOpacity;
    }

    ctx.fillStyle = currentColor;
    ctx.fill(path);

    if (currentBrushType === 'pencil') {
      const bounds = points.reduce(
        (acc, p) => ({
          minX: Math.min(acc.minX, p[0]),
          maxX: Math.max(acc.maxX, p[0]),
          minY: Math.min(acc.minY, p[1]),
          maxY: Math.max(acc.maxY, p[1]),
        }),
        {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        }
      );

      const density = Math.max(
        12,
        Math.floor(
          (bounds.maxX - bounds.minX + (bounds.maxY - bounds.minY)) * 0.08
        )
      );

      ctx.save();
      ctx.clip(path);

      for (let i = 0; i < density; i += 1) {
        const x = bounds.minX + Math.random() * Math.max(1, bounds.maxX - bounds.minX);
        const y = bounds.minY + Math.random() * Math.max(1, bounds.maxY - bounds.minY);
        const r = Math.max(0.35, currentSize * 0.06 * Math.random());

        ctx.beginPath();
        ctx.globalAlpha = currentOpacity * (0.05 + Math.random() * 0.08);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  };

  const drawEraserStroke = (canvas, from, to) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,1)';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();

    ctx.restore();
  };

  const renderCanvas = (preview = null) => {
    const canvas = viewCanvasRef.current;
    const contentCanvas = getContentCanvas();

    if (!canvas || !contentCanvas || !displaySize.width || !displaySize.height) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(displaySize.width * dpr));
    const pixelHeight = Math.max(1, Math.floor(displaySize.height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${displaySize.width}px`;
      canvas.style.height = `${displaySize.height}px`;
    }

    const ctx = canvas.getContext('2d');
    const { scale, drawWidth, drawHeight, offsetX, offsetY } = getContainRect();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displaySize.width, displaySize.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displaySize.width, displaySize.height);

    ctx.drawImage(contentCanvas, offsetX, offsetY, drawWidth, drawHeight);

    if (!preview) return;

    if (preview.tool === 'freehand') {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      drawPerfectFreehandStroke({
        ctx,
        points: preview.points,
        currentBrushType: preview.brushType,
        currentColor: preview.color,
        currentOpacity: preview.opacity,
        currentSize: preview.size,
        isComplete: false,
      });

      ctx.restore();
      return;
    }

    const start = docToDisplayPoint(preview.start);
    const current = docToDisplayPoint(preview.current);

    ctx.save();
    ctx.strokeStyle = preview.color;
    ctx.fillStyle = preview.color;
    ctx.globalAlpha = preview.opacity;
    ctx.lineWidth = Math.max(1, preview.size * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (preview.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    } else if (preview.tool === 'rectangle') {
      ctx.strokeRect(
        start.x,
        start.y,
        current.x - start.x,
        current.y - start.y
      );
    } else if (preview.tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(current.x - start.x, 2) +
          Math.pow(current.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const beginInteraction = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return;

    e.preventDefault();
    const point = toDocPoint(e);
    const canvas = getContentCanvas();

    if (!canvas) return;

    activePointerIdRef.current = e.pointerId ?? null;
    viewCanvasRef.current?.setPointerCapture?.(e.pointerId);

    const pressure = getPointerPressure(e);

    interactionRef.current = {
      mode: 'draw',
      tool,
      start: { x: point.x, y: point.y },
      last: { x: point.x, y: point.y },
      points: [[point.x, point.y, pressure]],
    };

    if (tool === 'eraser') {
      drawEraserStroke(canvas, point, point);
      renderCanvas();
      return;
    }

    if (tool === 'brush') {
      renderCanvas({
        tool: 'freehand',
        points: interactionRef.current.points,
        brushType,
        color,
        size,
        opacity,
      });
    }
  };

  const moveInteraction = (e) => {
    if (!interactionRef.current) return;

    if (
      activePointerIdRef.current != null &&
      e.pointerId != null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    e.preventDefault();
    const current = toDocPoint(e);

    const canvas = getContentCanvas();
    if (!canvas) return;

    const currentTool = interactionRef.current.tool;

    if (currentTool === 'eraser') {
      drawEraserStroke(canvas, interactionRef.current.last, current);
      interactionRef.current.last = { x: current.x, y: current.y };
      renderCanvas();
      return;
    }

    if (currentTool === 'brush') {
      const lastPoint =
        interactionRef.current.points[interactionRef.current.points.length - 1];

      const dist = Math.hypot(current.x - lastPoint[0], current.y - lastPoint[1]);

      if (dist < 0.6) return;

      interactionRef.current.points.push([
        current.x,
        current.y,
        getPointerPressure(e),
      ]);

      interactionRef.current.last = { x: current.x, y: current.y };

      renderCanvas({
        tool: 'freehand',
        points: interactionRef.current.points,
        brushType,
        color,
        size,
        opacity,
      });
      return;
    }

    renderCanvas({
      tool: currentTool,
      start: interactionRef.current.start,
      current,
      color,
      size,
      opacity,
    });
  };

  const endInteraction = (e) => {
    if (
      activePointerIdRef.current != null &&
      e.pointerId != null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    if (!interactionRef.current) {
      releasePointer();
      return;
    }

    e.preventDefault();
    const current = toDocPoint(e);
    const currentTool = interactionRef.current.tool;
    const canvas = getContentCanvas();

    if (!canvas) {
      interactionRef.current = null;
      releasePointer();
      return;
    }

    if (currentTool === 'brush') {
      const last =
        interactionRef.current.points[interactionRef.current.points.length - 1];
      const finalPressure = getPointerPressure(e);

      if (!last || last[0] !== current.x || last[1] !== current.y) {
        interactionRef.current.points.push([current.x, current.y, finalPressure]);
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      drawPerfectFreehandStroke({
        ctx,
        points: interactionRef.current.points,
        currentBrushType: brushType,
        currentColor: color,
        currentOpacity: opacity,
        currentSize: size,
        isComplete: true,
      });

      interactionRef.current = null;
      releasePointer();
      renderCanvas();
      commitHistory();
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(interactionRef.current.start.x, interactionRef.current.start.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    } else if (currentTool === 'rectangle') {
      ctx.strokeRect(
        interactionRef.current.start.x,
        interactionRef.current.start.y,
        current.x - interactionRef.current.start.x,
        current.y - interactionRef.current.start.y
      );
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(current.x - interactionRef.current.start.x, 2) +
          Math.pow(current.y - interactionRef.current.start.y, 2)
      );

      ctx.beginPath();
      ctx.arc(
        interactionRef.current.start.x,
        interactionRef.current.start.y,
        radius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.restore();

    interactionRef.current = null;
    releasePointer();
    renderCanvas();
    commitHistory();
  };

  const clearCanvas = () => {
    const canvas = getContentCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderCanvas();
    commitHistory();
  };

  const importImageFile = async (file) => {
    if (!file) return;
    const canvas = getContentCanvas();
    if (!canvas) return;

    const url = URL.createObjectURL(file);
    await loadImageToCanvas(canvas, url, 'contain');
    URL.revokeObjectURL(url);

    renderCanvas();
    commitHistory();
  };

  const exportImage = () => {
    const link = document.createElement('a');
    link.download = 'flashcard-face.png';
    link.href = exportComposite();
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
    if (contentCanvasRef.current) return;

    contentCanvasRef.current = createOffscreenCanvas(DOC_WIDTH, DOC_HEIGHT);

    const boot = async () => {
      if (initialImage) {
        await loadImageToCanvas(contentCanvasRef.current, initialImage, 'contain');
      }

      historyRef.current = [];
      historyStepRef.current = -1;
      commitHistory();

      requestAnimationFrame(() => {
        renderCanvas();
      });
    };

    boot();
  }, [initialImage]);

  useEffect(() => {
    renderCanvas();
  }, [displaySize, tool, brushType, color, size, opacity]);

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
    return () => releasePointer();
  }, []);

  return (
    <div className="advanced-editor" ref={containerRef}>
      <div className="advanced-stage">
        <canvas
          ref={viewCanvasRef}
          className="advanced-stage-canvas"
          onPointerDown={beginInteraction}
          onPointerMove={moveInteraction}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);