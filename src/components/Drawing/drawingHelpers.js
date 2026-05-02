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
      inputMode = 'all', // all hoặc stylusOnly
      onStatusChange,
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

    const updateStatus = useCallback(() => {
      onStatusChange?.({
        canUndo: historyRef.current.length > 0,
        canRedo: redoHistoryRef.current.length > 0,
      });
    }, [onStatusChange]);

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

      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, rect.width, rect.height);

      historyRef.current.forEach((action) => drawAction(context, action));

      if (currentStrokeRef.current) {
        drawAction(context, currentStrokeRef.current);
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
    }, [backgroundColor, drawAction]);

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
          }

          redoHistoryRef.current = [];
          redrawCanvas();
          updateStatus();
          return;
        }

        historyRef.current = [];
        redoHistoryRef.current = [];
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
    }, [initialData, initialImage, redrawCanvas, setupCanvasSize, updateStatus]);

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
    }, [redrawCanvas, setupCanvasSize]);

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
          // Tap nhẹ vẫn tạo được một chấm tròn nhỏ.
          if (stroke.points.length === 1) {
            const [x, y, pressure] = stroke.points[0];
            stroke.points.push([x + 0.01, y + 0.01, pressure]);
          }

          if (stroke.points.length > 1) {
            historyRef.current.push({ ...stroke, points: [...stroke.points] });
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
        }}
      />
    );
  }
);

DrawingScreen.displayName = 'DrawingScreen';

export default DrawingScreen;