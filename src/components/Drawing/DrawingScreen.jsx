import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { getStroke } from 'perfect-freehand';

// Tùy chỉnh lực và nét vẽ dựa trên loại bút
const getDynamicStrokeOptions = (brushType, size) => {
  const baseOptions = {
    size,
    thinning: 0.45,
    smoothing: 0.78,
    streamline: 0.65,
    simulatePressure: true,
    easing: (t) => t,
    start: {
      taper: size * 0.8,
      cap: true,
      easing: (t) => t * t,
    },
    end: {
      taper: size * 1.6,
      cap: true,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    },
  };

  switch (brushType) {
    case 'pencil':
      return {
        ...baseOptions,
        size: size * 0.9,
        thinning: 0.18,
        smoothing: 0.9,
        streamline: 0.72,
      };

    case 'marker':
      return {
        ...baseOptions,
        size: size * 1.55,
        thinning: 0.03,
        smoothing: 0.86,
        streamline: 0.78,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      };

    case 'calligraphy':
      return {
        ...baseOptions,
        size: size * 1.15,
        thinning: 0.82,
        smoothing: 0.88,
        streamline: 0.7,
        start: { taper: size * 2.5, cap: true },
        end: { taper: size * 2.5, cap: true },
      };

    default:
      return baseOptions;
  }
};

const CANVAS_SCALE =
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

const getSvgPathFromStroke = (points) => {
  if (!points.length) return '';

  const max = points.length - 1;

  return points
    .reduce(
      (acc, point, i, arr) => {
        const [x0, y0] = point;
        const [x1, y1] = arr[i === max ? 0 : i + 1];

        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ['M', points[0][0], points[0][1], 'Q']
    )
    .concat('Z')
    .join(' ');
};

const getPressure = (e) => {
  if (e.pointerType === 'mouse') return 0.5;
  return Math.min(Math.max(e.pressure || 0.5, 0.12), 1);
};

const getDistance = (a, b) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
};

const appendSmoothPoint = (points, nextPoint) => {
  const lastPoint = points[points.length - 1];

  if (!lastPoint) {
    points.push(nextPoint);
    return;
  }

  const distance = getDistance(lastPoint, nextPoint);

  // Bỏ điểm quá sát để giảm rung tay.
  if (distance < 0.7) return;

  // Nội suy thêm điểm nếu di chuyển nhanh để nét không bị gãy.
  if (distance > 6) {
    const steps = Math.min(8, Math.floor(distance / 3));

    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      points.push([
        lastPoint[0] + (nextPoint[0] - lastPoint[0]) * t,
        lastPoint[1] + (nextPoint[1] - lastPoint[1]) * t,
        lastPoint[2] + (nextPoint[2] - lastPoint[2]) * t,
      ]);
    }
  }

  points.push(nextPoint);
};

const DrawingScreen = forwardRef(({
  initialImage,
  initialData,
  tool = 'brush',
  brushType = 'pen',
  color = '#0f172a',
  size = 4,
  opacity = 1,
  backgroundColor = '#ffffff',
  inputMode = 'all', // all hoặc stylusOnly
  onStatusChange
}, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Quản lý lịch sử thay vì strokesRef đơn thuần để hỗ trợ cả Import Ảnh
  const historyRef = useRef([]);
  const redoHistoryRef = useRef([]);
  const currentStrokeRef = useRef(null);

  // Cập nhật trạng thái Undo/Redo ra UI bên ngoài
  const updateStatus = useCallback(() => {
    if (onStatusChange) {
      onStatusChange({
        canUndo: historyRef.current.length > 0,
        canRedo: redoHistoryRef.current.length > 0
      });
    }
  }, [onStatusChange]);

  // Redraw toàn bộ lịch sử
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    
    // Reset background
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, rect.width, rect.height);

    const drawAction = (action) => {
      if (action.type === 'stroke') {
        const points = getStroke(action.points, getDynamicStrokeOptions(action.brushType, action.size));
        if (points.length < 2) return;
        
        const pathData = points
          .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`)
          .join(' ');
        const path = new Path2D(pathData);

        if (action.tool === 'eraser') {
          context.globalCompositeOperation = 'destination-out';
          context.fillStyle = '#000000'; // Màu không quan trọng khi xóa
          context.globalAlpha = 1;
        } else {
          context.globalCompositeOperation = 'source-over';
          context.fillStyle = action.color;
          context.globalAlpha = action.opacity;
        }
        context.fill(path);
      } else if (action.type === 'image' && action.imgNode) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.drawImage(action.imgNode, action.x, action.y, action.width, action.height);
      }
    };

    // Vẽ lại từ lịch sử
    historyRef.current.forEach(drawAction);

    // Vẽ nét đang vẽ dở (real-time)
    if (currentStrokeRef.current) {
      drawAction(currentStrokeRef.current);
    }

    // Reset lại context chuẩn
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }, [backgroundColor]);

  // Khởi tạo Canvas và tải dữ liệu ban đầu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * CANVAS_SCALE;
    canvas.height = rect.height * CANVAS_SCALE;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.scale(CANVAS_SCALE, CANVAS_SCALE);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        // Load toàn bộ ảnh nếu có trong lịch sử trước khi vẽ
        const loadPromises = parsed.map(action => {
          if (action.type === 'image') {
            return new Promise(resolve => {
              const img = new Image();
              img.onload = () => { action.imgNode = img; resolve(); };
              img.onerror = resolve; // Bỏ qua nếu lỗi
              img.src = action.dataUrl;
            });
          }
          return Promise.resolve();
        });

        Promise.all(loadPromises).then(() => {
          historyRef.current = parsed;
          redrawCanvas();
          updateStatus();
        });
      } catch (e) {
        console.error("Lỗi parse initialData", e);
      }
    } else if (initialImage) {
      const img = new Image();
      img.onload = () => {
        const action = { type: 'image', dataUrl: initialImage, x: 0, y: 0, width: rect.width, height: rect.height, imgNode: img };
        historyRef.current = [action];
        redrawCanvas();
        updateStatus();
      };
      img.src = initialImage;
    } else {
      redrawCanvas();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý vẽ
  const handlePointerDown = useCallback((e) => {
    if (inputMode === 'stylusOnly' && e.pointerType !== 'pen') return;
    if (!e.isPrimary) return; // Chỉ nhận 1 chạm

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current = {
      type: 'stroke',
      tool,
      brushType,
      color,
      size,
      opacity,
      points: [[x, y, e.pressure || 0.5]]
    };
    redrawCanvas();
  }, [inputMode, tool, brushType, color, size, opacity, redrawCanvas]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    if (inputMode === 'stylusOnly' && e.pointerType !== 'pen') return;
    if (!e.isPrimary) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current.points.push([x, y, e.pressure || 0.5]);
    redrawCanvas();
  }, [inputMode, redrawCanvas]);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      historyRef.current.push({ ...currentStrokeRef.current });
      redoHistoryRef.current = [];
      updateStatus();
    }
    currentStrokeRef.current = null;
    redrawCanvas();
  }, [redrawCanvas, updateStatus]);

  // Đăng ký sự kiện
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', handlePointerDown, true);
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
    canvas.addEventListener('pointerup', handlePointerUp, true);
    canvas.addEventListener('pointercancel', handlePointerUp, true);

    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, true);
      canvas.removeEventListener('pointermove', handlePointerMove, true);
      canvas.removeEventListener('pointerup', handlePointerUp, true);
      canvas.removeEventListener('pointercancel', handlePointerUp, true);
      canvas.removeEventListener('touchstart', (e) => e.preventDefault());
      canvas.removeEventListener('touchmove', (e) => e.preventDefault());
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  // Expose các phương thức ra bên ngoài
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyRef.current.length > 0) {
        redoHistoryRef.current.push(historyRef.current.pop());
        redrawCanvas();
        updateStatus();
      }
    },
    redo: () => {
      if (redoHistoryRef.current.length > 0) {
        historyRef.current.push(redoHistoryRef.current.pop());
        redrawCanvas();
        updateStatus();
      }
    },
    toDataURL: () => {
      return canvasRef.current?.toDataURL('image/png');
    },
    getSceneData: () => {
      // Loại bỏ imgNode (DOM Elements) trước khi lưu JSON
      const dataToSave = historyRef.current.map(action => {
        const copy = { ...action };
        delete copy.imgNode;
        return copy;
      });
      return JSON.stringify(dataToSave);
    },
    importImageFile: (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return resolve();
            
            const rect = canvas.getBoundingClientRect();
            // Scale ảnh để fit 90% khung hình
            const scale = Math.min((rect.width * 0.9) / img.width, (rect.height * 0.9) / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (rect.width - w) / 2;
            const y = (rect.height - h) / 2;

            historyRef.current.push({
              type: 'image',
              dataUrl: e.target.result,
              x, y, width: w, height: h,
              imgNode: img
            });
            redoHistoryRef.current = [];
            redrawCanvas();
            updateStatus();
            resolve();
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full touch-none ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
      style={{ display: 'block' }}
    />
  );
});

DrawingScreen.displayName = 'DrawingScreen';

export default DrawingScreen;