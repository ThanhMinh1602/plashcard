import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import './AdvancedCanvas.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function AdvancedCanvas(
  {
    initialImage = '',
    tool = 'brush',
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

  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const interactionRef = useRef(null);
  const docSizeRef = useRef({ width: 0, height: 0 });

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

    if (!canvas || !docWidth || !docHeight || !displaySize.width || !displaySize.height) {
      return { x: 0, y: 0, clientX: 0, clientY: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getClientPoint(e);
    const { drawWidth, drawHeight, offsetX, offsetY } = getContainRect();

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

    if (preview) {
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
    }
  };

  const drawBrushStroke = (canvas, from, to, erase = false) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;

    if (erase) {
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
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
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

    interactionRef.current = {
      mode: 'draw',
      tool,
      start: { x: point.x, y: point.y },
      last: { x: point.x, y: point.y },
    };

    if (tool === 'brush' || tool === 'eraser') {
      drawBrushStroke(canvas, point, point, tool === 'eraser');
      renderCanvas();
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

    if (currentTool === 'brush' || currentTool === 'eraser') {
      drawBrushStroke(
        canvas,
        interactionRef.current.last,
        current,
        currentTool === 'eraser'
      );

      interactionRef.current.last = { x: current.x, y: current.y };
      renderCanvas();
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
    if (!displaySize.width || !displaySize.height || docSizeRef.current.width) return;

    const initialDoc = {
      width: displaySize.width,
      height: displaySize.height,
    };

    docSizeRef.current = initialDoc;
    contentCanvasRef.current = createOffscreenCanvas(
      initialDoc.width,
      initialDoc.height
    );

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
  }, [displaySize, initialImage]);

  useEffect(() => {
    renderCanvas();
  }, [displaySize, tool, color, size, opacity]);

  useEffect(() => {
    onStatusChange?.({
      canUndo: historyStep > 0,
      canRedo: historyStep < historyLength - 1,
    });
  }, [historyStep, historyLength, onStatusChange]);

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