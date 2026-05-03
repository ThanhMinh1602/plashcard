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

      paperPattern = 'grid',
      paperGridSize = 24,
      paperGridColor = 'rgba(100, 116, 139, 0.18)',
      paperBottomTintColor = '',
      paperBottomTintRows = 0,
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

    const historyCanvasRef = useRef(null);
    const historyContextRef = useRef(null);
    const activeLayerCanvasRef = useRef(null);
    const activeLayerContextRef = useRef(null);

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

    const shouldDrawWithPointer = useCallback(
      (event) => {
        if (inputMode === 'stylusOnly') {
          return event.pointerType === 'pen';
        }
        return true;
      },
      [inputMode]
    );

    useEffect(() => {
      onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);

    useEffect(() => {
      backgroundColorRef.current = backgroundColor;
      redrawCanvasRef.current?.();
    }, [backgroundColor]);

    useEffect(() => {
      paperConfigRef.current = {
        paperPattern, paperGridSize, paperGridColor, paperBottomTintColor,
        paperBottomTintRows, paperLineSpacing, paperLineColor,
        paperMarginLineColor, paperMarginLeft, showPaperMargin,
      };
      redrawCanvasRef.current?.();
    }, [
      paperPattern, paperGridSize, paperGridColor, paperBottomTintColor,
      paperBottomTintRows, paperLineSpacing, paperLineColor,
      paperMarginLineColor, paperMarginLeft, showPaperMargin,
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
          width: rect.width, height: rect.height, backgroundColor: backgroundColorRef.current,
          gridColor: config.paperGridColor, gridSize: config.paperGridSize,
          bottomTintColor: config.paperBottomTintColor, bottomTintRows: config.paperBottomTintRows,
        });
        return;
      }
      if (config.paperPattern === 'ruled') {
        drawRuledPaperBackground(context, {
          width: rect.width, height: rect.height, backgroundColor: backgroundColorRef.current,
          lineColor: config.paperLineColor, marginLineColor: config.paperMarginLineColor,
          lineSpacing: config.paperLineSpacing, marginLeft: config.paperMarginLeft, showMargin: config.showPaperMargin,
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
          points: action.points, brushType: action.brushType, size: action.size,
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
        context.drawImage(action.imgNode, action.x, action.y, action.width, action.height);
      }
    }, []);

    const renderHistoryToCache = useCallback(() => {
      const canvas = historyCanvasRef.current;
      const context = historyContextRef.current;
      if (!canvas || !context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current.forEach((action) => drawAction(context, action));
    }, [drawAction]);

    const redrawCanvas = useCallback(() => {
      const mainCanvas = canvasRef.current;
      const mainContext = contextRef.current;
      const historyCanvas = historyCanvasRef.current;
      const activeCanvas = activeLayerCanvasRef.current;
      const activeContext = activeLayerContextRef.current;

      if (!mainCanvas || !mainContext || !historyCanvas || !activeCanvas || !activeContext) return;

      const width = mainCanvas.offsetWidth;
      const height = mainCanvas.offsetHeight;
      const logicalRect = { width, height };

      drawPaperBackground(mainContext, logicalRect);
      mainContext.globalCompositeOperation = 'source-over';
      mainContext.globalAlpha = 1;

      if (currentStrokeRef.current) {
        activeContext.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        activeContext.globalCompositeOperation = 'source-over';
        activeContext.globalAlpha = 1;
        activeContext.drawImage(historyCanvas, 0, 0);
        drawAction(activeContext, currentStrokeRef.current);
        mainContext.drawImage(activeCanvas, 0, 0, width, height);
      } else {
        mainContext.drawImage(historyCanvas, 0, 0, width, height);
      }
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

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      const scaledWidth = Math.max(1, Math.floor(width * CANVAS_SCALE));
      const scaledHeight = Math.max(1, Math.floor(height * CANVAS_SCALE));

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      contextRef.current = context;

      const initOffscreen = (cvsRef, ctxRef) => {
        let cvs = cvsRef.current;
        if (!cvs) {
          cvs = document.createElement('canvas');
          cvsRef.current = cvs;
        }
        cvs.width = scaledWidth;
        cvs.height = scaledHeight;
        
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctxRef.current = ctx;
      };

      initOffscreen(historyCanvasRef, historyContextRef);
      initOffscreen(activeLayerCanvasRef, activeLayerContextRef);

      return { width, height };
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
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
          return;
        }

        if (initialImage) {
          const imgNode = await loadImageNode(initialImage);
          if (!mounted) return;
          if (imgNode) {
            historyRef.current = [{
              type: 'image', dataUrl: initialImage, x: 0, y: 0,
              width: rect.width, height: rect.height, imgNode,
            }];
          } else {
            historyRef.current = [];
          }
          redoHistoryRef.current = [];
          currentStrokeRef.current = null;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
          return;
        }

        historyRef.current = [];
        redoHistoryRef.current = [];
        currentStrokeRef.current = null;
        renderHistoryToCache();
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
    }, [initialData, initialImage, setupCanvasSize, renderHistoryToCache, redrawCanvas, updateStatus]);

    // CHẶN BUG RESIZE OBSERVER (Nguyên nhân làm hư nét bút)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || typeof ResizeObserver === 'undefined') return undefined;

      let prevW = canvas.offsetWidth;
      let prevH = canvas.offsetHeight;
      let firstResize = true;

      const resizeObserver = new ResizeObserver(() => {
        if (firstResize) {
          firstResize = false;
          return;
        }
        
        const currentW = canvas.offsetWidth;
        const currentH = canvas.offsetHeight;
        
        // Nếu chênh lệch quá nhỏ (sub-pixel do transition) thì hủy lệnh vẽ lại
        if (currentW === prevW && currentH === prevH) return;
        
        prevW = currentW;
        prevH = currentH;

        setupCanvasSize();
        renderHistoryToCache();
        redrawCanvas();
      });

      resizeObserver.observe(canvas);
      return () => resizeObserver.disconnect();
    }, [setupCanvasSize, renderHistoryToCache, redrawCanvas]);

    const createPointFromEvent = useCallback((event) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? canvas.offsetWidth / rect.width : 1;
      const scaleY = rect.height > 0 ? canvas.offsetHeight / rect.height : 1;
      return [
        (event.clientX - rect.left) * scaleX,
        (event.clientY - rect.top) * scaleY,
        getPointerPressure(event),
      ];
    }, []);

    const handlePointerDown = useCallback((event) => {
        if (!shouldDrawWithPointer(event)) return;
        if (!event.isPrimary) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        event.preventDefault();
        event.stopPropagation();
        canvas.setPointerCapture?.(event.pointerId);

        const point = createPointFromEvent(event);
        if (!point) return;

        isDrawingRef.current = true;
        currentStrokeRef.current = {
          type: 'stroke', tool, brushType, color, size, opacity, points: [point],
        };
        queueRedraw();
      },
      [shouldDrawWithPointer, tool, brushType, color, size, opacity, createPointFromEvent, queueRedraw]
    );

    const handlePointerMove = useCallback((event) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        if (!shouldDrawWithPointer(event)) return;
        if (!event.isPrimary) return;

        event.preventDefault();
        event.stopPropagation();

        const events = event.getCoalescedEvents?.() || [event];
        events.forEach((coalescedEvent) => {
          const point = createPointFromEvent(coalescedEvent);
          if (!point) return;
          appendSmoothPoint(currentStrokeRef.current.points, point);
        });
        queueRedraw();
      },
      [shouldDrawWithPointer, createPointFromEvent, queueRedraw]
    );

    const finishCurrentStroke = useCallback((event) => {
        if (!isDrawingRef.current) return;
        if (event && shouldDrawWithPointer(event)) {
          event.preventDefault?.();
          event.stopPropagation?.();
        }
        canvasRef.current?.releasePointerCapture?.(event?.pointerId);
        isDrawingRef.current = false;

        const stroke = currentStrokeRef.current;
        if (stroke) {
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
        renderHistoryToCache();
        redrawCanvas();
      },
      [renderHistoryToCache, redrawCanvas, updateStatus, shouldDrawWithPointer]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const preventTouch = (event) => {
        event.preventDefault();
      };
      canvas.addEventListener('pointerdown', handlePointerDown, true);
      canvas.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
      canvas.addEventListener('pointerup', finishCurrentStroke, true);
      canvas.addEventListener('pointercancel', finishCurrentStroke, true);
      canvas.addEventListener('pointerleave', finishCurrentStroke, true);

      if (inputMode !== 'stylusOnly') {
        canvas.addEventListener('touchstart', preventTouch, { passive: false });
        canvas.addEventListener('touchmove', preventTouch, { passive: false });
      }

      return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown, true);
        canvas.removeEventListener('pointermove', handlePointerMove, true);
        canvas.removeEventListener('pointerup', finishCurrentStroke, true);
        canvas.removeEventListener('pointercancel', finishCurrentStroke, true);
        canvas.removeEventListener('pointerleave', finishCurrentStroke, true);
        if (inputMode !== 'stylusOnly') {
          canvas.removeEventListener('touchstart', preventTouch);
          canvas.removeEventListener('touchmove', preventTouch);
        }
      };
    }, [handlePointerDown, handlePointerMove, finishCurrentStroke, inputMode]);

    useImperativeHandle(ref, () => ({
        undo: () => {
          const last = historyRef.current.pop();
          if (!last) return;
          redoHistoryRef.current.push(last);
          currentStrokeRef.current = null;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
        redo: () => {
          const next = redoHistoryRef.current.pop();
          if (!next) return;
          historyRef.current.push(next);
          currentStrokeRef.current = null;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
        toDataURL: () => {
          redrawCanvas();
          return canvasRef.current?.toDataURL('image/png') || '';
        },
        getSceneData: () => serializeSceneData(historyRef.current),
        importImageFile: async (file) => {
          const canvas = canvasRef.current;
          if (!canvas || !file) return;
          const logicalRect = { width: canvas.offsetWidth, height: canvas.offsetHeight };
          const imageAction = await createImageActionFromFile(file, logicalRect);
          historyRef.current.push(imageAction);
          redoHistoryRef.current = [];
          currentStrokeRef.current = null;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
      }),
      [renderHistoryToCache, redrawCanvas, updateStatus]
    );

    // CHẶN DOUBLE-TAP ZOOM (Thủ phạm chính)
    return (
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{
          // Đổi thành 'manipulation' để vẫn cho cuộn nhưng cấm iPad zoom khi chạm tay đúp vào
          touchAction: inputMode === 'stylusOnly' ? 'manipulation' : 'none', 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />
    );
  }
);

DrawingScreen.displayName = 'DrawingScreen';

export default DrawingScreen;