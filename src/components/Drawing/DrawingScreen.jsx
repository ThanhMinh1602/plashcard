import React, { useRef, useEffect, useCallback, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { FiArrowLeft, FiDownload, FiTrash2 } from 'react-icons/fi';

// Constants for drawing performance
const STROKE_OPTIONS = {
  size: 8,
  thinning: 0.7,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t) => t,
  start: { taper: 100, easing: (t) => t * t * t },
  end: { taper: 100, easing: (t) => 1 - (1 - t) * (1 - t) * (1 - t) },
};

const CANVAS_SCALE = window.devicePixelRatio || 1;
const BG_COLOR = '#ffffff';
const STROKE_COLOR = '#0f172a';

const DrawingScreen = ({ onBack, onSave }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);
  const strokesRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to fill screen
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * CANVAS_SCALE;
    canvas.height = rect.height * CANVAS_SCALE;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.scale(CANVAS_SCALE, CANVAS_SCALE);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = BG_COLOR;
    context.fillRect(0, 0, rect.width, rect.height);

    contextRef.current = context;
  }, []);

  // Redraw canvas from strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.fillStyle = BG_COLOR;
    context.fillRect(0, 0, rect.width, rect.height);

    // Draw all strokes
    strokesRef.current.forEach((stroke) => {
      drawStroke(context, stroke);
    });

    // Draw current stroke
    if (currentStrokeRef.current.length > 0) {
      drawStroke(context, currentStrokeRef.current);
    }
  }, []);

  // Draw a single stroke using perfect-freehand
  const drawStroke = useCallback((context, points) => {
    if (points.length < 2) return;

    try {
      const outlinePoints = getStroke(points, STROKE_OPTIONS);
      const pathData = outlinePoints
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`)
        .join(' ');

      const path = new Path2D(pathData);
      context.fillStyle = STROKE_COLOR;
      context.fill(path);
    } catch (e) {
      console.error('Error drawing stroke:', e);
    }
  }, []);

  // Handle pointer down
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    isDrawingRef.current = true;
    currentStrokeRef.current = [];

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current.push([x, y, e.pressure || 0.5]);
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle pointer move - CRITICAL for instant response
  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      currentStrokeRef.current.push([x, y, e.pressure || 0.5]);

      // Redraw only the current frame - maximum performance
      redrawCanvas();
    },
    [redrawCanvas]
  );

  // Handle pointer up
  const handlePointerUp = useCallback((e) => {
    if (!isDrawingRef.current) return;

    e.preventDefault();
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push([...currentStrokeRef.current]);
      setCanUndo(true);
    }
    currentStrokeRef.current = [];
  }, []);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;

    strokesRef.current.pop();
    setCanUndo(strokesRef.current.length > 0);
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle clear
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.fillStyle = BG_COLOR;
    context.fillRect(0, 0, rect.width, rect.height);

    strokesRef.current = [];
    currentStrokeRef.current = [];
    setCanUndo(false);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const imageData = canvas.toDataURL('image/png');
      onSave?.(imageData, strokesRef.current);
      onBack?.();
    } catch (error) {
      console.error('Error saving drawing:', error);
      alert('Lỗi lưu bản vẽ');
    }
  }, [onSave, onBack]);

  // Handle download
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `drawing-${Date.now()}.png`;
    link.click();
  }, []);

  // Setup pointer events for instant response
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use capture phase for maximum responsiveness
    canvas.addEventListener('pointerdown', handlePointerDown, true);
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
    canvas.addEventListener('pointerup', handlePointerUp, true);
    canvas.addEventListener('pointercancel', handlePointerUp, true);

    // Prevent default browser behaviors
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Escape to go back
      if (e.key === 'Escape') {
        onBack?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, onBack]);

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại (Esc)"
          >
            <FiArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Bảng Vẽ</h2>
            <p className="text-xs text-slate-500">Vẽ tự do - hỗ trợ iPad & bút cảm ứng</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600"
            title="Tải xuống"
          >
            <FiDownload size={20} />
          </button>

          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium text-slate-700"
            title="Hoàn tác (Ctrl+Z)"
          >
            Hoàn tác
          </button>

          <button
            onClick={handleClear}
            className="p-2 hover:bg-rose-100 rounded-lg transition text-rose-600"
            title="Xóa tất cả"
          >
            <FiTrash2 size={20} />
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1 sm:px-4 sm:py-2 rounded-lg bg-sky-500 hover:bg-sky-600 transition text-sm font-bold text-white"
          >
            Lưu
          </button>
        </div>
      </div>

      {/* Canvas - takes full remaining space */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair bg-white touch-none"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Instructions for iPad */}
      <div className="absolute bottom-4 left-4 right-4 max-w-xs bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 pointer-events-none">
        💡 <strong>Mẹo:</strong> Sử dụng bút cảm ứng cho độ chính xác cao. Vẽ nhanh = phản hồi tức thì!
      </div>
    </div>
  );
};

export default DrawingScreen;
