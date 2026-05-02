import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  CANVAS_SCALE,
  appendSmoothPoint,
  createImageActionFromFile,
  drawGridPaperBackground,
  drawRuledPaperBackground,
  getPointerPressure,
  getStrokePathData,
  hydrateSceneData,
  loadImageNode,
  serializeSceneData,
} from './drawingHelpers';

const DrawingScreen = forwardRef(
  (
    {
      initialImage,
      initialData,
      tool = 'brush',
      brushType = 'pen',
      color = '#0f172a',
      size = 4,
      opacity = 1,
      backgroundColor = '#ffffff',
      inputMode = 'all',
      onStatusChange,

      // none | grid | ruled
      paperPattern = 'grid',

      // Ô kẻ nhỏ
      paperGridSize = 24,
      paperGridColor = 'rgba(100, 116, 139, 0.18)',

      // Vùng màu dưới cùng, tính theo số ô nhỏ
      paperBottomTintColor = '',
      paperBottomTintRows = 0,

      // Dòng kẻ ngang, giữ lại nếu sau này muốn dùng
      paperLineSpacing = 30,
      paperLineColor = 'rgba(148, 163, 184, 0.36)',
      paperMarginLineColor = 'rgba(244, 114, 182, 0.34)',
      paperMarginLeft = 46,
      showPaperMargin = true,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);

    const isDrawingRef = useRef(false);
    const historyRef = useRef([]);
    const redoHistoryRef = useRef([]);
    const currentStrokeRef = useRef(null);
    const rafRef = useRef(null);
    const redrawCanvasRef = useRef(null);

    const onStatusChangeRef = useRef(onStatusChange);
    const backgroundColorRef = useRef(backgroundColor);

    const paperConfigRef = useRef({
      paperPattern,

      paperGridSize,
      paperGridColor,

      paperBottomTintColor,
      paperBottomTintRows,

      paperLineSpacing,
      paperLineColor,
      paperMarginLineColor,
      paperMarginLeft,
      showPaperMargin,
    });

    useEffect(() => {
      onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);

    useEffect(() => {
      backgroundColorRef.current = backgroundColor;
      redrawCanvasRef.current?.();
    }, [backgroundColor]);

    useEffect(() => {
      paperConfigRef.current = {
        paperPattern,

        paperGridSize,
        paperGridColor,

        paperBottomTintColor,
        paperBottomTintRows,

        paperLineSpacing,
        paperLineColor,
        paperMarginLineColor,
        paperMarginLeft,
        showPaperMargin,
      };

      redrawCanvasRef.current?.();
    }, [
      paperPattern,

      paperGridSize,
      paperGridColor,

      paperBottomTintColor,
      paperBottomTintRows,

      paperLineSpacing,
      paperLineColor,
      paperMarginLineColor,
      paperMarginLeft,
      showPaperMargin,
    ]);

    const updateStatus = useCallback(() => {
      onStatusChangeRef.current?.({
        canUndo: historyRef.current.length > 0,
        canRedo: redoHistoryRef.current.length > 0,
      });
    }, []);

    const drawPaperBackground = useCallback((context, rect) => {
      const config = paperConfigRef.current;

      if (config.paperPattern === 'grid') {
        drawGridPaperBackground(context, {
          width: rect.width,
          height: rect.height,
          backgroundColor: backgroundColorRef.current,
          gridColor: config.paperGridColor,
          gridSize: config.paperGridSize,
          bottomTintColor: config.paperBottomTintColor,
          bottomTintRows: config.paperBottomTintRows,
        });

        return;
      }

      if (config.paperPattern === 'ruled') {
        drawRuledPaperBackground(context, {
          width: rect.width,
          height: rect.height,
          backgroundColor: backgroundColorRef.current,
          lineColor: config.paperLineColor,
          marginLineColor: config.paperMarginLineColor,
          lineSpacing: config.paperLineSpacing,
          marginLeft: config.paperMarginLeft,
          showMargin: config.showPaperMargin,
        });

        return;
      }

      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = backgroundColorRef.current;
      context.fillRect(0, 0, rect.width, rect.height);
    }, []);

    const drawAction = useCallback((context, action) => {
      if (!action) return;

      if (action.type === 'stroke') {
        const pathData = getStrokePathData({
          points: action.points,
          brushType: action.brushType,
          size: action.size,
        });

        if (!pathData) return;

        const path = new Path2D(pathData);

        if (action.tool === 'eraser') {
          // Tẩy chỉ xóa layer nét/ảnh, không làm mất nền ô kẻ.
          context.globalCompositeOperation = 'destination-out';
          context.fillStyle = '#000000';
          context.globalAlpha = 1;
        } else {
          context.globalCompositeOperation = 'source-over';
          context.fillStyle = action.color;
          context.globalAlpha = action.opacity;
        }

        context.fill(path);
        return;
      }

      if (action.type === 'image' && action.imgNode) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.drawImage(
          action.imgNode,
          action.x,
          action.y,
          action.width,
          action.height
        );
      }
    }, []);

    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const context = contextRef.current;

      if (!canvas || !context) return;

      const rect = canvas.getBoundingClientRect();

      // 1. Vẽ nền giấy + ô kẻ trên canvas chính
      drawPaperBackground(context, rect);

      // 2. Vẽ nét/ảnh trên layer riêng để tẩy không làm mất nền
      const contentCanvas = document.createElement('canvas');
      contentCanvas.width = canvas.width;
      contentCanvas.height = canvas.height;

      const contentContext = contentCanvas.getContext('2d', {
        willReadFrequently: true,
      });

      contentContext.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
      contentContext.lineCap = 'round';
      contentContext.lineJoin = 'round';
      contentContext.imageSmoothingEnabled = true;
      contentContext.imageSmoothingQuality = 'high';

      historyRef.current.forEach((action) => {
        drawAction(contentContext, action);
      });

      if (currentStrokeRef.current) {
        drawAction(contentContext, currentStrokeRef.current);
      }

      // 3. Ghép layer nét/ảnh lên nền giấy
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.drawImage(contentCanvas, 0, 0, rect.width, rect.height);

      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    }, [drawAction, drawPaperBackground]);

    useEffect(() => {
      redrawCanvasRef.current = redrawCanvas;
    }, [redrawCanvas]);

    const queueRedraw = useCallback(() => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        redrawCanvas();
      });
    }, [redrawCanvas]);

    const setupCanvasSize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      canvas.width = Math.max(1, Math.floor(rect.width * CANVAS_SCALE));
      canvas.height = Math.max(1, Math.floor(rect.height * CANVAS_SCALE));

      const context = canvas.getContext('2d', { willReadFrequently: true });

      context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      contextRef.current = context;

      return rect;
    }, []);

    useEffect(() => {
      let mounted = true;

      const initCanvas = async () => {
        const rect = setupCanvasSize();
        if (!rect) return;

        if (initialData) {
          const hydrated = await hydrateSceneData(initialData);
          if (!mounted) return;

          historyRef.current = hydrated;
          redoHistoryRef.current = [];
          currentStrokeRef.current = null;

          redrawCanvas();
          updateStatus();
          return;
        }

        if (initialImage) {
          const imgNode = await loadImageNode(initialImage);
          if (!mounted) return;

          if (imgNode) {
            historyRef.current = [
              {
                type: 'image',
                dataUrl: initialImage,
                x: 0,
                y: 0,
                width: rect.width,
                height: rect.height,
                imgNode,
              },
            ];
          } else {
            historyRef.current = [];
          }

          redoHistoryRef.current = [];
          currentStrokeRef.current = null;

          redrawCanvas();
          updateStatus();
          return;
        }

        historyRef.current = [];
        redoHistoryRef.current = [];
        currentStrokeRef.current = null;

        redrawCanvas();
        updateStatus();
      };

      initCanvas();

      return () => {
        mounted = false;

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, [initialData, initialImage, setupCanvasSize, redrawCanvas, updateStatus]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || typeof ResizeObserver === 'undefined') return undefined;

      let firstResize = true;

      const resizeObserver = new ResizeObserver(() => {
        if (firstResize) {
          firstResize = false;
          return;
        }

        setupCanvasSize();
        redrawCanvas();
      });

      resizeObserver.observe(canvas);

      return () => resizeObserver.disconnect();
    }, [setupCanvasSize, redrawCanvas]);

    const createPointFromEvent = useCallback((event) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      return [
        event.clientX - rect.left,
        event.clientY - rect.top,
        getPointerPressure(event),
      ];
    }, []);

    const handlePointerDown = useCallback(
      (event) => {
        if (inputMode === 'stylusOnly' && event.pointerType !== 'pen') return;
        if (!event.isPrimary) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        event.preventDefault();
        canvas.setPointerCapture?.(event.pointerId);

        const point = createPointFromEvent(event);
        if (!point) return;

        isDrawingRef.current = true;

        currentStrokeRef.current = {
          type: 'stroke',
          tool,
          brushType,
          color,
          size,
          opacity,
          points: [point],
        };

        queueRedraw();
      },
      [
        inputMode,
        tool,
        brushType,
        color,
        size,
        opacity,
        createPointFromEvent,
        queueRedraw,
      ]
    );

    const handlePointerMove = useCallback(
      (event) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        if (inputMode === 'stylusOnly' && event.pointerType !== 'pen') return;
        if (!event.isPrimary) return;

        event.preventDefault();

        const events = event.getCoalescedEvents?.() || [event];

        events.forEach((coalescedEvent) => {
          const point = createPointFromEvent(coalescedEvent);
          if (!point) return;

          appendSmoothPoint(currentStrokeRef.current.points, point);
        });

        queueRedraw();
      },
      [inputMode, createPointFromEvent, queueRedraw]
    );

    const finishCurrentStroke = useCallback(
      (event) => {
        if (!isDrawingRef.current) return;

        event?.preventDefault?.();
        canvasRef.current?.releasePointerCapture?.(event.pointerId);

        isDrawingRef.current = false;

        const stroke = currentStrokeRef.current;

        if (stroke) {
          if (stroke.points.length === 1) {
            const [x, y, pressure] = stroke.points[0];
            stroke.points.push([x + 0.01, y + 0.01, pressure]);
          }

          if (stroke.points.length > 1) {
            historyRef.current.push({
              ...stroke,
              points: [...stroke.points],
            });

            redoHistoryRef.current = [];
            updateStatus();
          }
        }

        currentStrokeRef.current = null;
        redrawCanvas();
      },
      [redrawCanvas, updateStatus]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;

      const preventTouch = (event) => event.preventDefault();

      canvas.addEventListener('pointerdown', handlePointerDown, true);
      canvas.addEventListener('pointermove', handlePointerMove, {
        passive: false,
        capture: true,
      });
      canvas.addEventListener('pointerup', finishCurrentStroke, true);
      canvas.addEventListener('pointercancel', finishCurrentStroke, true);
      canvas.addEventListener('pointerleave', finishCurrentStroke, true);
      canvas.addEventListener('touchstart', preventTouch, { passive: false });
      canvas.addEventListener('touchmove', preventTouch, { passive: false });

      return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown, true);
        canvas.removeEventListener('pointermove', handlePointerMove, true);
        canvas.removeEventListener('pointerup', finishCurrentStroke, true);
        canvas.removeEventListener('pointercancel', finishCurrentStroke, true);
        canvas.removeEventListener('pointerleave', finishCurrentStroke, true);
        canvas.removeEventListener('touchstart', preventTouch);
        canvas.removeEventListener('touchmove', preventTouch);
      };
    }, [handlePointerDown, handlePointerMove, finishCurrentStroke]);

    useImperativeHandle(
      ref,
      () => ({
        undo: () => {
          if (historyRef.current.length <= 0) return;

          redoHistoryRef.current.push(historyRef.current.pop());
          redrawCanvas();
          updateStatus();
        },

        redo: () => {
          if (redoHistoryRef.current.length <= 0) return;

          historyRef.current.push(redoHistoryRef.current.pop());
          redrawCanvas();
          updateStatus();
        },

        toDataURL: () => {
          return canvasRef.current?.toDataURL('image/png') || '';
        },

        getSceneData: () => {
          return serializeSceneData(historyRef.current);
        },

        importImageFile: async (file) => {
          const canvas = canvasRef.current;
          if (!canvas || !file) return;

          const rect = canvas.getBoundingClientRect();
          const imageAction = await createImageActionFromFile(file, rect);

          historyRef.current.push(imageAction);
          redoHistoryRef.current = [];
          redrawCanvas();
          updateStatus();
        },
      }),
      [redrawCanvas, updateStatus]
    );

    return (
      <canvas
        ref={canvasRef}
        className={`h-full w-full touch-none ${
          tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
        }`}
        style={{
          display: 'block',
          touchAction: 'none',
          backgroundColor,
        }}
      />
    );
  }
);

DrawingScreen.displayName = 'DrawingScreen';

export default DrawingScreen;