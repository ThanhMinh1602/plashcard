import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import './AdvancedCanvas.css';

const AdvancedCanvas = forwardRef(({ initialImage = '' }, ref) => {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [historyStep, setHistoryStep] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL('image/png') || '',
    clear: () => clearCanvas(),
    canvas: canvasRef.current,
  }));

  const getCanvasRect = () => {
    const canvas = canvasRef.current;
    return canvas.getBoundingClientRect();
  };

  const getCoordinates = (e) => {
    const rect = getCanvasRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const snapshot = canvas.toDataURL('image/png');
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);

    nextHistory.push(snapshot);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;

    setHistoryLength(nextHistory.length);
    setHistoryStep(historyStepRef.current);
  };

  const drawImageToCanvas = (src, shouldSave = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    const ctx = canvas.getContext('2d');
    const rect = getCanvasRect();

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);

      if (shouldSave) pushHistory();
    };
    img.src = src;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    historyRef.current = [];
    historyStepRef.current = -1;
    setHistoryLength(0);
    setHistoryStep(-1);

    if (initialImage) {
      drawImageToCanvas(initialImage, true);
    } else {
      pushHistory();
    }
  }, [initialImage]);

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    setStartPoint({ x, y });
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'fill') {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;

    if (tool === 'eraser') {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      ctx.restore();
      setStartPoint({ x, y });
      return;
    }

    ctx.strokeStyle = color;
    ctx.globalAlpha = tool === 'brush' ? opacity * 0.7 : opacity;

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setStartPoint({ x, y });
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'rectangle') {
      ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
      );
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'fill') {
      floodFill(canvas, x, y, color);
    }

    setIsDrawing(false);
    pushHistory();
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const getPixelColor = (data, x, y, width) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };

  const colorsMatch = (a, b, tolerance = 10) => {
    return a.every((value, index) => Math.abs(value - b[index]) <= tolerance);
  };

  const floodFill = (canvas, x, y, fillColor) => {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const pixelX = Math.floor(x * scaleX);
    const pixelY = Math.floor(y * scaleY);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const { width, height } = imageData;

    const targetColor = getPixelColor(data, pixelX, pixelY, width);
    const fillRgb = hexToRgb(fillColor);
    const replacement = [fillRgb.r, fillRgb.g, fillRgb.b, 255];

    if (colorsMatch(targetColor, replacement, 0)) return;

    const queue = [[pixelX, pixelY]];
    const visited = new Set();

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const key = `${cx}-${cy}`;

      if (cx < 0 || cy < 0 || cx >= width || cy >= height || visited.has(key)) {
        continue;
      }

      visited.add(key);

      const currentColor = getPixelColor(data, cx, cy, width);
      if (!colorsMatch(currentColor, targetColor)) continue;

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

  const loadFromHistory = (imageData) => {
    drawImageToCanvas(imageData, false);
  };

  const undo = () => {
    if (historyStepRef.current <= 0) return;

    historyStepRef.current -= 1;
    setHistoryStep(historyStepRef.current);
    loadFromHistory(historyRef.current[historyStepRef.current]);
  };

  const redo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;

    historyStepRef.current += 1;
    setHistoryStep(historyStepRef.current);
    loadFromHistory(historyRef.current[historyStepRef.current]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = getCanvasRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    pushHistory();
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'flashcard-painting.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="advanced-canvas-container">
      <div className="advanced-canvas-toolbar">
        <div className="advanced-toolbar-group">
          <label className="advanced-toolbar-label">Công cụ</label>
          <div className="advanced-tool-buttons">
            {[
              { id: 'pencil', icon: '✏️', label: 'Bút chì' },
              { id: 'brush', icon: '🎨', label: 'Bàn chải' },
              { id: 'eraser', icon: '🧹', label: 'Xóa' },
              { id: 'line', icon: '📏', label: 'Đường' },
              { id: 'rectangle', icon: '▭', label: 'Hình chữ nhật' },
              { id: 'circle', icon: '⭕', label: 'Hình tròn' },
              { id: 'fill', icon: '💧', label: 'Tô màu' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`advanced-tool-btn ${tool === item.id ? 'active' : ''}`}
                onClick={() => setTool(item.id)}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="advanced-toolbar-group">
          <label className="advanced-toolbar-label">Màu</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="advanced-color-picker"
          />
        </div>

        <div className="advanced-toolbar-group">
          <label className="advanced-toolbar-label">Kích cỡ: {size}px</label>
          <input
            type="range"
            min="1"
            max="50"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="advanced-slider"
          />
        </div>

        <div className="advanced-toolbar-group">
          <label className="advanced-toolbar-label">
            Độ đậm: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="advanced-slider"
          />
        </div>

        <div className="advanced-toolbar-group advanced-toolbar-actions">
          <button
            type="button"
            className="advanced-action-btn"
            onClick={undo}
            disabled={historyStep <= 0}
            title="Hoàn tác"
          >
            ↶
          </button>

          <button
            type="button"
            className="advanced-action-btn"
            onClick={redo}
            disabled={historyStep >= historyLength - 1}
            title="Làm lại"
          >
            ↷
          </button>

          <button
            type="button"
            className="advanced-action-btn clear"
            onClick={clearCanvas}
            title="Xóa tất cả"
          >
            🗑️
          </button>

          <button
            type="button"
            className="advanced-action-btn download"
            onClick={downloadImage}
            title="Tải về"
          >
            💾
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
        className="advanced-canvas-surface"
      />
    </div>
  );
});

AdvancedCanvas.displayName = 'AdvancedCanvas';
export default AdvancedCanvas;