import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import './AdvancedCanvas.css';

const TOOL_LIST = [
  { id: 'brush', icon: '🖌️', label: 'Brush' },
  { id: 'eraser', icon: '🧽', label: 'Eraser' },
  { id: 'line', icon: '📏', label: 'Line' },
  { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '⭕', label: 'Circle' },
  { id: 'fill', icon: '🪣', label: 'Fill' },
  { id: 'text', icon: '🔤', label: 'Text' },
  { id: 'eyedropper', icon: '🎯', label: 'Eyedropper' },
  { id: 'hand', icon: '✋', label: 'Hand' },
];

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function AdvancedCanvas({ initialImage = '' }, ref) {
  const containerRef = useRef(null);
  const viewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const layerStoreRef = useRef(new Map());
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const interactionRef = useRef(null);
  const docSizeRef = useRef({ width: 0, height: 0 });

  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);

  const [tool, setTool] = useState('brush');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(1);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => exportComposite(),
  }));

  const getLayerCanvas = (layerId) => layerStoreRef.current.get(layerId) || null;

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

  const toDocPoint = (e) => {
    const canvas = viewCanvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0, clientX: 0, clientY: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getClientPoint(e);
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;

    const x = (clientX - rect.left - currentPan.x) / currentZoom;
    const y = (clientY - rect.top - currentPan.y) / currentZoom;

    return {
      x: clamp(x, 0, docSizeRef.current.width),
      y: clamp(y, 0, docSizeRef.current.height),
      clientX,
      clientY,
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

  const createOffscreenCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    return canvas;
  };

  const createLayer = (name) => {
    const { width, height } = docSizeRef.current;
    const id = makeId();
    const canvas = createOffscreenCanvas(width, height);

    layerStoreRef.current.set(id, canvas);

    return {
      id,
      name,
      visible: true,
      opacity: 1,
    };
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

  const buildSnapshot = (currentLayers = layers, currentActive = activeLayerId) => ({
    activeLayerId: currentActive,
    layers: currentLayers.map((layer) => ({
      ...layer,
      dataUrl: getLayerCanvas(layer.id)?.toDataURL('image/png') || '',
    })),
  });

  const commitHistory = (currentLayers = layers, currentActive = activeLayerId) => {
    const snapshot = buildSnapshot(currentLayers, currentActive);
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);

    nextHistory.push(snapshot);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;

    setHistoryLength(nextHistory.length);
    setHistoryStep(historyStepRef.current);
  };

  const buildCompositeCanvas = (layerList = layers) => {
    const { width, height } = docSizeRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    layerList.forEach((layer) => {
      if (!layer.visible) return;
      const layerCanvas = getLayerCanvas(layer.id);
      if (!layerCanvas) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layerCanvas, 0, 0);
      ctx.restore();
    });

    return exportCanvas;
  };

  const exportComposite = () => buildCompositeCanvas().toDataURL('image/png');

  const fitToView = () => {
    const { width: docWidth, height: docHeight } = docSizeRef.current;
    const { width: displayWidth, height: displayHeight } = displaySize;

    if (!docWidth || !docHeight || !displayWidth || !displayHeight) return;

    const padding = 24;
    const nextZoom = Math.min(
      (displayWidth - padding * 2) / docWidth,
      (displayHeight - padding * 2) / docHeight,
      1
    );

    const nextPan = {
      x: (displayWidth - docWidth * nextZoom) / 2,
      y: (displayHeight - docHeight * nextZoom) / 2,
    };

    setZoom(nextZoom);
    setPan(nextPan);
  };

  const renderComposite = (layerList = layers, preview = null) => {
    const canvas = viewCanvasRef.current;
    if (!canvas || !displaySize.width || !displaySize.height) return;

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
    const { width: docWidth, height: docHeight } = docSizeRef.current;
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displaySize.width, displaySize.height);

    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, displaySize.width, displaySize.height);

    ctx.save();
    ctx.translate(currentPan.x, currentPan.y);
    ctx.scale(currentZoom, currentZoom);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, docWidth, docHeight);

    layerList.forEach((layer) => {
      if (!layer.visible) return;
      const layerCanvas = getLayerCanvas(layer.id);
      if (!layerCanvas) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layerCanvas, 0, 0, docWidth, docHeight);
      ctx.restore();
    });

    if (preview) {
      ctx.save();
      ctx.strokeStyle = preview.color;
      ctx.fillStyle = preview.color;
      ctx.globalAlpha = preview.opacity;
      ctx.lineWidth = preview.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (preview.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(preview.start.x, preview.start.y);
        ctx.lineTo(preview.current.x, preview.current.y);
        ctx.stroke();
      } else if (preview.tool === 'rectangle') {
        ctx.strokeRect(
          preview.start.x,
          preview.start.y,
          preview.current.x - preview.start.x,
          preview.current.y - preview.start.y
        );
      } else if (preview.tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(preview.current.x - preview.start.x, 2) +
            Math.pow(preview.current.y - preview.start.y, 2)
        );
        ctx.beginPath();
        ctx.arc(preview.start.x, preview.start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 / currentZoom;
    ctx.strokeRect(0, 0, docWidth, docHeight);

    ctx.restore();
  };

  const drawBrushStroke = (layerCanvas, from, to, erase = false) => {
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });

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

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  };

  const rgbToHex = (r, g, b) =>
    `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  const colorsMatch = (a, b, tolerance = 10) =>
    a.every((value, index) => Math.abs(value - b[index]) <= tolerance);

  const fillLayer = (layerCanvas, x, y) => {
    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
    const { data, width, height } = imageData;

    const px = clamp(Math.floor(x), 0, width - 1);
    const py = clamp(Math.floor(y), 0, height - 1);

    const getPixel = (sx, sy) => {
      const index = (sy * width + sx) * 4;
      return [data[index], data[index + 1], data[index + 2], data[index + 3]];
    };

    const target = getPixel(px, py);
    const nextColor = hexToRgb(color);
    const replacement = [
      nextColor.r,
      nextColor.g,
      nextColor.b,
      Math.round(opacity * 255),
    ];

    if (colorsMatch(target, replacement, 0)) return;

    const queue = [[px, py]];
    const visited = new Set();

    while (queue.length) {
      const [cx, cy] = queue.shift();
      const key = `${cx}-${cy}`;

      if (cx < 0 || cy < 0 || cx >= width || cy >= height || visited.has(key)) {
        continue;
      }

      visited.add(key);

      const current = getPixel(cx, cy);
      if (!colorsMatch(current, target)) continue;

      const index = (cy * width + cx) * 4;
      data[index] = replacement[0];
      data[index + 1] = replacement[1];
      data[index + 2] = replacement[2];
      data[index + 3] = replacement[3];

      queue.push([cx + 1, cy]);
      queue.push([cx - 1, cy]);
      queue.push([cx, cy + 1]);
      queue.push([cx, cy - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const applyText = (point) => {
    const layerCanvas = getLayerCanvas(activeLayerId);
    if (!layerCanvas) return;

    const text = window.prompt('Nhập chữ');
    if (!text) return;

    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `${Math.max(18, size * 6)}px Arial`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, point.x, point.y);
    ctx.restore();

    renderComposite();
    commitHistory();
  };

  const applyEyedropper = (point) => {
    const composite = buildCompositeCanvas();
    const ctx = composite.getContext('2d', { willReadFrequently: true });
    const pixel = ctx.getImageData(
      clamp(Math.floor(point.x), 0, composite.width - 1),
      clamp(Math.floor(point.y), 0, composite.height - 1),
      1,
      1
    ).data;

    setColor(rgbToHex(pixel[0], pixel[1], pixel[2]));
  };

  const beginInteraction = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (typeof e.isPrimary === 'boolean' && !e.isPrimary) return;

    e.preventDefault();
    const point = toDocPoint(e);

    if (tool === 'hand') {
      activePointerIdRef.current = e.pointerId ?? null;
      viewCanvasRef.current?.setPointerCapture?.(e.pointerId);

      interactionRef.current = {
        mode: 'pan',
        startClientX: point.clientX,
        startClientY: point.clientY,
        startPan: { ...panRef.current },
      };
      return;
    }

    if (!activeLayerId) return;

    if (tool === 'text') {
      applyText(point);
      return;
    }

    if (tool === 'eyedropper') {
      applyEyedropper(point);
      return;
    }

    const layerCanvas = getLayerCanvas(activeLayerId);
    if (!layerCanvas) return;

    if (tool === 'fill') {
      fillLayer(layerCanvas, point.x, point.y);
      renderComposite();
      commitHistory();
      return;
    }

    activePointerIdRef.current = e.pointerId ?? null;
    viewCanvasRef.current?.setPointerCapture?.(e.pointerId);

    interactionRef.current = {
      mode: 'draw',
      tool,
      start: { x: point.x, y: point.y },
      last: { x: point.x, y: point.y },
    };

    if (tool === 'brush' || tool === 'eraser') {
      drawBrushStroke(layerCanvas, point, point, tool === 'eraser');
      renderComposite();
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

    if (interactionRef.current.mode === 'pan') {
      const dx = current.clientX - interactionRef.current.startClientX;
      const dy = current.clientY - interactionRef.current.startClientY;

      setPan({
        x: interactionRef.current.startPan.x + dx,
        y: interactionRef.current.startPan.y + dy,
      });
      return;
    }

    const layerCanvas = getLayerCanvas(activeLayerId);
    if (!layerCanvas) return;

    const currentTool = interactionRef.current.tool;

    if (currentTool === 'brush' || currentTool === 'eraser') {
      drawBrushStroke(
        layerCanvas,
        interactionRef.current.last,
        current,
        currentTool === 'eraser'
      );

      interactionRef.current.last = { x: current.x, y: current.y };
      renderComposite();
      return;
    }

    renderComposite(layers, {
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

    if (interactionRef.current.mode === 'pan') {
      interactionRef.current = null;
      releasePointer();
      return;
    }

    const currentTool = interactionRef.current.tool;
    const layerCanvas = getLayerCanvas(activeLayerId);

    if (!layerCanvas) {
      interactionRef.current = null;
      releasePointer();
      return;
    }

    const ctx = layerCanvas.getContext('2d', { willReadFrequently: true });
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
    renderComposite();
    commitHistory();
  };

  const restoreSnapshot = async (snapshot) => {
    const nextStore = new Map();

    const nextLayers = snapshot.layers.map((layer) => {
      const canvas = createOffscreenCanvas(
        docSizeRef.current.width,
        docSizeRef.current.height
      );

      nextStore.set(layer.id, canvas);

      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
      };
    });

    await Promise.all(
      snapshot.layers.map((layer) =>
        loadImageToCanvas(nextStore.get(layer.id), layer.dataUrl, 'stretch')
      )
    );

    layerStoreRef.current = nextStore;
    setLayers(nextLayers);

    const nextActive =
      snapshot.activeLayerId && nextStore.has(snapshot.activeLayerId)
        ? snapshot.activeLayerId
        : nextLayers[nextLayers.length - 1]?.id || null;

    setActiveLayerId(nextActive);

    requestAnimationFrame(() => renderComposite(nextLayers));
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

  const addLayer = () => {
    const nextLayer = createLayer(`Layer ${layers.length + 1}`);
    const nextLayers = [...layers, nextLayer];

    setLayers(nextLayers);
    setActiveLayerId(nextLayer.id);
    renderComposite(nextLayers);
    commitHistory(nextLayers, nextLayer.id);
  };

  const duplicateLayer = (layerId) => {
    const sourceLayer = getLayerCanvas(layerId);
    const sourceMeta = layers.find((layer) => layer.id === layerId);

    if (!sourceLayer || !sourceMeta) return;

    const duplicate = createLayer(`${sourceMeta.name} copy`);
    const duplicateCanvas = getLayerCanvas(duplicate.id);
    const ctx = duplicateCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceLayer, 0, 0);

    const index = layers.findIndex((layer) => layer.id === layerId);
    const nextLayers = [...layers];
    nextLayers.splice(index + 1, 0, duplicate);

    setLayers(nextLayers);
    setActiveLayerId(duplicate.id);
    renderComposite(nextLayers);
    commitHistory(nextLayers, duplicate.id);
  };

  const deleteLayer = (layerId) => {
    if (layers.length === 1) {
      clearActiveLayer();
      return;
    }

    layerStoreRef.current.delete(layerId);

    const nextLayers = layers.filter((layer) => layer.id !== layerId);
    const nextActive = nextLayers[nextLayers.length - 1]?.id || null;

    setLayers(nextLayers);
    setActiveLayerId(nextActive);
    renderComposite(nextLayers);
    commitHistory(nextLayers, nextActive);
  };

  const moveLayer = (layerId, direction) => {
    const index = layers.findIndex((layer) => layer.id === layerId);
    if (index === -1) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= layers.length) return;

    const nextLayers = [...layers];
    const [moved] = nextLayers.splice(index, 1);
    nextLayers.splice(nextIndex, 0, moved);

    setLayers(nextLayers);
    renderComposite(nextLayers);
    commitHistory(nextLayers, activeLayerId);
  };

  const updateLayerMeta = (layerId, patch) => {
    const nextLayers = layers.map((layer) =>
      layer.id === layerId ? { ...layer, ...patch } : layer
    );

    setLayers(nextLayers);
    renderComposite(nextLayers);
    commitHistory(nextLayers, activeLayerId);
  };

  const clearActiveLayer = () => {
    const canvas = getLayerCanvas(activeLayerId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderComposite();
    commitHistory();
  };

  const handleImportImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeLayerId) return;

    const url = URL.createObjectURL(file);
    const canvas = getLayerCanvas(activeLayerId);

    await loadImageToCanvas(canvas, url, 'contain');
    URL.revokeObjectURL(url);

    renderComposite();
    commitHistory();
    e.target.value = '';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'flashcard-painting.png';
    link.href = exportComposite();
    link.click();
  };

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

    const firstLayer = createLayer('Layer 1');

    const boot = async () => {
      if (initialImage) {
        const canvas = getLayerCanvas(firstLayer.id);
        await loadImageToCanvas(canvas, initialImage, 'stretch');
      }

      const nextLayers = [firstLayer];
      setLayers(nextLayers);
      setActiveLayerId(firstLayer.id);

      historyRef.current = [];
      historyStepRef.current = -1;
      commitHistory(nextLayers, firstLayer.id);

      requestAnimationFrame(() => {
        fitToView();
        renderComposite(nextLayers);
      });
    };

    boot();
  }, [displaySize, initialImage]);

  useEffect(() => {
    renderComposite();
  }, [layers, zoom, pan, displaySize]);

  useEffect(() => {
    const canvas = viewCanvasRef.current;
    if (!canvas) return;

    const wheelListener = (event) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const docX = (cursorX - currentPan.x) / currentZoom;
      const docY = (cursorY - currentPan.y) / currentZoom;

      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = clamp(currentZoom * zoomFactor, 0.2, 5);
      const nextPan = {
        x: cursorX - docX * nextZoom,
        y: cursorY - docY * nextZoom,
      };

      setZoom(nextZoom);
      setPan(nextPan);
    };

    canvas.addEventListener('wheel', wheelListener, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelListener);
    };
  }, []);

  useEffect(() => {
    return () => releasePointer();
  }, []);

  const layerListForPanel = [...layers].reverse();

  return (
    <div className="advanced-editor">
      <div className="advanced-topbar">
        <div className="advanced-topbar-group">
          <button
            type="button"
            className="editor-btn"
            onClick={undo}
            disabled={historyStep === 0}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            className="editor-btn"
            onClick={redo}
            disabled={historyStep >= historyLength - 1}
          >
            ↷ Redo
          </button>
        </div>

        <div className="advanced-topbar-group">
          <label className="editor-label">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-input"
          />
        </div>

        <div className="advanced-topbar-group">
          <label className="editor-label">Size {size}px</label>
          <input
            type="range"
            min="1"
            max="80"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="editor-slider"
          />
        </div>

        <div className="advanced-topbar-group">
          <label className="editor-label">Opacity {Math.round(opacity * 100)}%</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="editor-slider"
          />
        </div>

        <div className="advanced-topbar-group">
          <button
            type="button"
            className="editor-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            📂 Import
          </button>
          <button type="button" className="editor-btn" onClick={handleDownload}>
            💾 Export
          </button>
          <button type="button" className="editor-btn" onClick={clearActiveLayer}>
            🗑 Clear layer
          </button>
        </div>

        <div className="advanced-topbar-group">
          <button
            type="button"
            className="editor-btn"
            onClick={() => setZoom((z) => clamp(z * 0.9, 0.2, 5))}
          >
            −
          </button>
          <button type="button" className="editor-btn" onClick={fitToView}>
            Fit
          </button>
          <button
            type="button"
            className="editor-btn"
            onClick={() => setZoom((z) => clamp(z * 1.1, 0.2, 5))}
          >
            +
          </button>
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImportImage}
          hidden
        />
      </div>

      <div className="advanced-workspace">
        <aside className="advanced-leftbar">
          {TOOL_LIST.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              className={`tool-icon-btn ${tool === item.id ? 'active' : ''}`}
              onClick={() => setTool(item.id)}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </aside>

        <div ref={containerRef} className="advanced-stage">
          <canvas
            ref={viewCanvasRef}
            className="advanced-stage-canvas"
            onPointerDown={beginInteraction}
            onPointerMove={moveInteraction}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
          />
        </div>

        <aside className="advanced-rightbar">
          <div className="panel-header">
            <h3>Layers</h3>
            <div className="panel-actions">
              <button type="button" className="panel-btn" onClick={addLayer}>
                + Add
              </button>
            </div>
          </div>

          <div className="layers-list">
            {layerListForPanel.map((layer) => (
              <div
                key={layer.id}
                className={`layer-item ${layer.id === activeLayerId ? 'active' : ''}`}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <div className="layer-row">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayerMeta(layer.id, { visible: !layer.visible });
                    }}
                  >
                    {layer.visible ? '👁' : '🚫'}
                  </button>

                  <span className="layer-name">{layer.name}</span>
                </div>

                <div className="layer-row">
                  <label className="layer-opacity-label">
                    {Math.round(layer.opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateLayerMeta(layer.id, { opacity: Number(e.target.value) });
                    }}
                    className="layer-slider"
                  />
                </div>

                <div className="layer-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 1);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, -1);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="mini-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);