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
      backgroundImage = '',
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
    const dirtyRef = useRef(false);
    const selectionRef = useRef(null);
    const selectionDraftRef = useRef(null);
    const selectionDragRef = useRef(null);
    const rafRef = useRef(null);
    const redrawCanvasRef = useRef(null);

    const onStatusChangeRef = useRef(onStatusChange);
    const backgroundColorRef = useRef(backgroundColor);
    const backgroundImageRef = useRef(null);
    const baseImageRef = useRef(null);

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
      if (tool === 'select') return;

      selectionRef.current = null;
      selectionDraftRef.current = null;
      selectionDragRef.current = null;
      redrawCanvasRef.current?.();
    }, [tool]);

    useEffect(() => {
      let cancelled = false;

      if (!backgroundImage) {
        backgroundImageRef.current = null;
        redrawCanvasRef.current?.();
        return undefined;
      }

      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        backgroundImageRef.current = image;
        redrawCanvasRef.current?.();
      };
      image.onerror = () => {
        if (cancelled) return;
        backgroundImageRef.current = null;
        redrawCanvasRef.current?.();
      };
      image.src = backgroundImage;

      return () => {
        cancelled = true;
      };
    }, [backgroundImage]);

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

    const getActionBounds = useCallback((action) => {
      if (action?.type === 'image') {
        return {
          minX: action.x,
          minY: action.y,
          maxX: action.x + action.width,
          maxY: action.y + action.height,
        };
      }

      if (action?.type !== 'stroke' || !action.points?.length) return null;

      const xs = action.points.map((point) => point[0]);
      const ys = action.points.map((point) => point[1]);
      const padding = Math.max(Number(action.size) || 1, 1) * 2;

      return {
        minX: Math.min(...xs) - padding,
        minY: Math.min(...ys) - padding,
        maxX: Math.max(...xs) + padding,
        maxY: Math.max(...ys) + padding,
      };
    }, []);

    const getCombinedBounds = useCallback((actions) => {
      const bounds = actions.map(getActionBounds).filter(Boolean);
      if (!bounds.length) return null;

      return {
        minX: Math.min(...bounds.map((item) => item.minX)),
        minY: Math.min(...bounds.map((item) => item.minY)),
        maxX: Math.max(...bounds.map((item) => item.maxX)),
        maxY: Math.max(...bounds.map((item) => item.maxY)),
      };
    }, [getActionBounds]);

    const isPointInBounds = (point, bounds) => {
      return (
        point[0] >= bounds.minX &&
        point[0] <= bounds.maxX &&
        point[1] >= bounds.minY &&
        point[1] <= bounds.maxY
      );
    };

    const isPointInPolygon = (point, polygon) => {
      if (!polygon || polygon.length < 3) return false;

      let inside = false;
      const [x, y] = point;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        const intersects =
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;

        if (intersects) inside = !inside;
      }

      return inside;
    };

    const pointMatchesSelection = useCallback((point, selection) => {
      if (!selection) return false;

      if (selection.mode === 'rect') {
        return isPointInBounds(point, selection.bounds);
      }

      return isPointInPolygon(point, selection.points);
    }, []);

    const actionMatchesSelection = useCallback((action, selection) => {
      const bounds = getActionBounds(action);
      if (!bounds) return false;

      const center = [
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
      ];

      return pointMatchesSelection(center, selection);
    }, [getActionBounds, pointMatchesSelection]);

    const normalizeStrokeSegment = useCallback((action, points) => {
      if (!points?.length) return null;

      const segmentPoints =
        points.length === 1
          ? [
              points[0],
              [points[0][0] + 0.01, points[0][1] + 0.01, points[0][2]],
            ]
          : points;

      return {
        ...action,
        points: segmentPoints.map((point) => [...point]),
      };
    }, []);

    const splitActionBySelection = useCallback((action, selection) => {
      if (action?.type === 'image') {
        return actionMatchesSelection(action, selection)
          ? { outside: [], selected: [action] }
          : { outside: [action], selected: [] };
      }

      if (action?.type !== 'stroke' || !action.points?.length) {
        return { outside: [action], selected: [] };
      }

      const outside = [];
      const selected = [];
      let currentGroup = [];
      let currentInside = null;

      const flushGroup = () => {
        const segment = normalizeStrokeSegment(action, currentGroup);
        if (!segment) return;

        if (currentInside) {
          selected.push(segment);
        } else {
          outside.push(segment);
        }
      };

      action.points.forEach((point) => {
        const inside = pointMatchesSelection(point, selection);

        if (currentInside === null) {
          currentInside = inside;
          currentGroup = [point];
          return;
        }

        if (inside === currentInside) {
          currentGroup.push(point);
          return;
        }

        flushGroup();
        currentInside = inside;
        currentGroup = [point];
      });

      flushGroup();

      return { outside, selected };
    }, [
      actionMatchesSelection,
      normalizeStrokeSegment,
      pointMatchesSelection,
    ]);

    const moveAction = useCallback((action, dx, dy) => {
      if (action.type === 'stroke') {
        return {
          ...action,
          points: action.points.map((point) => [
            point[0] + dx,
            point[1] + dy,
            point[2],
          ]),
        };
      }

      if (action.type === 'image') {
        return {
          ...action,
          x: action.x + dx,
          y: action.y + dy,
        };
      }

      return action;
    }, []);

    const createPixelSelectionAction = useCallback(async (selection) => {
      const baseImageNode = baseImageRef.current;
      const canvas = canvasRef.current;
      if (!baseImageNode || !canvas || !selection?.bounds) return null;

      const canvasWidth = canvas.offsetWidth;
      const canvasHeight = canvas.offsetHeight;
      const minX = Math.max(0, Math.floor(selection.bounds.minX));
      const minY = Math.max(0, Math.floor(selection.bounds.minY));
      const maxX = Math.min(canvasWidth, Math.ceil(selection.bounds.maxX));
      const maxY = Math.min(canvasHeight, Math.ceil(selection.bounds.maxY));
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);

      if (width <= 1 || height <= 1) return null;

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = canvasWidth;
      sourceCanvas.height = canvasHeight;
      const sourceContext = sourceCanvas.getContext('2d');
      sourceContext.drawImage(baseImageNode, 0, 0, canvasWidth, canvasHeight);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = width;
      cropCanvas.height = height;
      const cropContext = cropCanvas.getContext('2d');
      cropContext.drawImage(
        sourceCanvas,
        minX,
        minY,
        width,
        height,
        0,
        0,
        width,
        height,
      );

      if (selection.points?.length >= 3) {
        cropContext.globalCompositeOperation = 'destination-in';
        cropContext.beginPath();
        cropContext.moveTo(selection.points[0][0] - minX, selection.points[0][1] - minY);
        selection.points.slice(1).forEach((point) => {
          cropContext.lineTo(point[0] - minX, point[1] - minY);
        });
        cropContext.closePath();
        cropContext.fill();
      }

      const imageData = cropContext.getImageData(0, 0, width, height).data;
      let hasVisiblePixel = false;
      for (let i = 3; i < imageData.length; i += 4) {
        if (imageData[i] > 0) {
          hasVisiblePixel = true;
          break;
        }
      }

      if (!hasVisiblePixel) return null;

      sourceContext.globalCompositeOperation = 'destination-out';
      sourceContext.beginPath();
      if (selection.points?.length >= 3) {
        sourceContext.moveTo(selection.points[0][0], selection.points[0][1]);
        selection.points.slice(1).forEach((point) => {
          sourceContext.lineTo(point[0], point[1]);
        });
        sourceContext.closePath();
      } else {
        sourceContext.rect(minX, minY, width, height);
      }
      sourceContext.fill();

      const nextBaseDataUrl = sourceCanvas.toDataURL('image/png');
      const cropDataUrl = cropCanvas.toDataURL('image/png');
      const [nextBaseImage, cropImage] = await Promise.all([
        loadImageNode(nextBaseDataUrl),
        loadImageNode(cropDataUrl),
      ]);

      if (!nextBaseImage || !cropImage) return null;

      baseImageRef.current = nextBaseImage;

      return {
        type: 'image',
        dataUrl: cropDataUrl,
        x: minX,
        y: minY,
        width,
        height,
        imgNode: cropImage,
        baseBeforeImgNode: baseImageNode,
        baseAfterImgNode: nextBaseImage,
      };
    }, []);

    const drawPaperBackground = useCallback((context, rect) => {
      const backgroundImageNode = backgroundImageRef.current;
      if (backgroundImageNode) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.drawImage(backgroundImageNode, 0, 0, rect.width, rect.height);
        return;
      }

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
      
      // Xóa sạch cache lịch sử (bỏ qua scale an toàn tuyệt đối)
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();

      const baseImageNode = baseImageRef.current;
      const mainCanvas = canvasRef.current;
      if (baseImageNode && mainCanvas) {
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        context.drawImage(
          baseImageNode,
          0,
          0,
          mainCanvas.offsetWidth,
          mainCanvas.offsetHeight,
        );
      }

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
        // Clear lớp nháp an toàn
        activeContext.save();
        activeContext.setTransform(1, 0, 0, 1, 0, 0);
        activeContext.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        activeContext.restore();

        activeContext.globalCompositeOperation = 'source-over';
        activeContext.globalAlpha = 1;
        
        // [FIX LỖI NẰM Ở ĐÂY]: Bắt buộc truyền width và height để iPad không tự scale 2 lần
        activeContext.drawImage(historyCanvas, 0, 0, width, height); 
        
        drawAction(activeContext, currentStrokeRef.current);
        mainContext.drawImage(activeCanvas, 0, 0, width, height);
      } else {
        mainContext.drawImage(historyCanvas, 0, 0, width, height);
      }

      const draft = selectionDraftRef.current;
      const selection = selectionRef.current;
      const overlay = draft || selection;

      if (overlay) {
        mainContext.save();
        mainContext.globalCompositeOperation = 'source-over';
        mainContext.strokeStyle = '#0ea5e9';
        mainContext.fillStyle = 'rgba(14, 165, 233, 0.08)';
        mainContext.lineWidth = 2;
        mainContext.setLineDash([8, 5]);

        if (overlay.mode === 'rect' && overlay.bounds) {
          const rect = overlay.bounds;
          mainContext.strokeRect(
            rect.minX,
            rect.minY,
            rect.maxX - rect.minX,
            rect.maxY - rect.minY,
          );
          mainContext.fillRect(
            rect.minX,
            rect.minY,
            rect.maxX - rect.minX,
            rect.maxY - rect.minY,
          );
        } else if (overlay.points?.length) {
          mainContext.beginPath();
          mainContext.moveTo(overlay.points[0][0], overlay.points[0][1]);
          overlay.points.slice(1).forEach((point) => {
            mainContext.lineTo(point[0], point[1]);
          });
          if (!draft) mainContext.closePath();
          mainContext.stroke();
          if (!draft) mainContext.fill();
        }

        mainContext.restore();
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

        const [baseImageNode, hydrated] = await Promise.all([
          initialImage ? loadImageNode(initialImage) : Promise.resolve(null),
          initialData ? hydrateSceneData(initialData) : Promise.resolve([]),
        ]);

        if (!mounted) return;

        baseImageRef.current = baseImageNode;
        historyRef.current = baseImageNode
          ? hydrated.filter((action) => action?.type === 'image')
          : hydrated;
        redoHistoryRef.current = [];
        currentStrokeRef.current = null;
        dirtyRef.current = false;
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
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();

        if (!shouldDrawWithPointer(event)) return;
        if (!event.isPrimary) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.setPointerCapture?.(event.pointerId);

        const point = createPointFromEvent(event);
        if (!point) return;

        if (tool === 'select') {
          const selectedBounds = selectionRef.current?.bounds;

          if (selectedBounds && isPointInBounds(point, selectedBounds)) {
            selectionDragRef.current = {
              lastPoint: point,
              indexes: selectionRef.current.indexes || [],
            };
            isDrawingRef.current = true;
            return;
          }

          selectionRef.current = null;
          selectionDraftRef.current = {
            mode: 'lasso',
            start: point,
            points: [point],
            bounds: {
              minX: point[0],
              minY: point[1],
              maxX: point[0],
              maxY: point[1],
            },
          };
          isDrawingRef.current = true;
          queueRedraw();
          return;
        }

        isDrawingRef.current = true;
        currentStrokeRef.current = {
          type: 'stroke', tool, brushType, color, size, opacity, points: [point],
        };
        queueRedraw();
      },
      [shouldDrawWithPointer, tool, brushType, color, size, opacity, createPointFromEvent, queueRedraw]
    );

    const handlePointerMove = useCallback((event) => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();

        if (!isDrawingRef.current) return;
        if (tool !== 'select' && !currentStrokeRef.current) return;
        if (!shouldDrawWithPointer(event)) return;
        if (!event.isPrimary) return;

        const events = event.getCoalescedEvents?.() || [event];

        if (tool === 'select') {
          events.forEach((coalescedEvent) => {
            const point = createPointFromEvent(coalescedEvent);
            if (!point) return;

            if (selectionDragRef.current) {
              const lastPoint = selectionDragRef.current.lastPoint;
              const dx = point[0] - lastPoint[0];
              const dy = point[1] - lastPoint[1];
              const indexSet = new Set(selectionDragRef.current.indexes);

              historyRef.current = historyRef.current.map((action, index) =>
                indexSet.has(index) ? moveAction(action, dx, dy) : action,
              );

              if (selectionRef.current?.bounds) {
                selectionRef.current = {
                  ...selectionRef.current,
                  bounds: {
                    minX: selectionRef.current.bounds.minX + dx,
                    minY: selectionRef.current.bounds.minY + dy,
                    maxX: selectionRef.current.bounds.maxX + dx,
                    maxY: selectionRef.current.bounds.maxY + dy,
                  },
                  points: selectionRef.current.points?.map((item) => [
                    item[0] + dx,
                    item[1] + dy,
                    item[2],
                  ]),
                };
              }

              selectionDragRef.current.lastPoint = point;
              renderHistoryToCache();
              queueRedraw();
              return;
            }

            if (selectionDraftRef.current) {
              const draft = selectionDraftRef.current;

              if (draft.mode === 'rect') {
                draft.bounds = {
                  minX: Math.min(draft.start[0], point[0]),
                  minY: Math.min(draft.start[1], point[1]),
                  maxX: Math.max(draft.start[0], point[0]),
                  maxY: Math.max(draft.start[1], point[1]),
                };
              } else {
                appendSmoothPoint(draft.points, point);
                draft.bounds = getCombinedBounds([
                  { type: 'stroke', points: draft.points, size: 1 },
                ]);
              }
            }
          });

          queueRedraw();
          return;
        }

        events.forEach((coalescedEvent) => {
          const point = createPointFromEvent(coalescedEvent);
          if (!point) return;
          appendSmoothPoint(currentStrokeRef.current.points, point);
        });
        queueRedraw();
      },
      [shouldDrawWithPointer, tool, createPointFromEvent, moveAction, renderHistoryToCache, queueRedraw, getCombinedBounds]
    );

    const finishCurrentStroke = useCallback(async (event) => {
        if (event && event.cancelable) event.preventDefault();
        if (event) event.stopPropagation();

        if (!isDrawingRef.current) return;
        
        canvasRef.current?.releasePointerCapture?.(event?.pointerId);
        isDrawingRef.current = false;

        if (tool === 'select') {
          if (selectionDragRef.current) {
            redoHistoryRef.current = [];
            selectionDragRef.current = null;
            dirtyRef.current = true;
            renderHistoryToCache();
            redrawCanvas();
            updateStatus();
            return;
          }

          const draft = selectionDraftRef.current;
          selectionDraftRef.current = null;

          if (draft) {
            const nextHistory = [];
            const selectedActions = [];

            historyRef.current.forEach((action) => {
              const { outside, selected } = splitActionBySelection(
                action,
                draft,
              );

              nextHistory.push(...outside);
              selectedActions.push(...selected);
            });

            const bounds = getCombinedBounds(selectedActions);

            if (selectedActions.length > 0 && bounds) {
              const firstSelectedIndex = nextHistory.length;
              const selectedIndexes = selectedActions.map(
                (_action, index) => firstSelectedIndex + index,
              );

              historyRef.current = [...nextHistory, ...selectedActions];
              redoHistoryRef.current = [];
              selectionRef.current = {
                mode: draft.mode,
                points:
                  draft.mode === 'rect'
                    ? [
                        [bounds.minX, bounds.minY, 0.5],
                        [bounds.maxX, bounds.minY, 0.5],
                        [bounds.maxX, bounds.maxY, 0.5],
                        [bounds.minX, bounds.maxY, 0.5],
                      ]
                    : draft.points,
                bounds,
                indexes: selectedIndexes,
              };
              renderHistoryToCache();
            } else {
              const pixelAction = await createPixelSelectionAction(draft);

              if (pixelAction) {
                const nextIndex = historyRef.current.length;
                historyRef.current = [...historyRef.current, pixelAction];
                redoHistoryRef.current = [];
                dirtyRef.current = true;
                selectionRef.current = {
                  mode: draft.mode,
                  points:
                    draft.mode === 'rect'
                      ? [
                          [pixelAction.x, pixelAction.y, 0.5],
                          [pixelAction.x + pixelAction.width, pixelAction.y, 0.5],
                          [
                            pixelAction.x + pixelAction.width,
                            pixelAction.y + pixelAction.height,
                            0.5,
                          ],
                          [pixelAction.x, pixelAction.y + pixelAction.height, 0.5],
                        ]
                      : draft.points,
                  bounds: {
                    minX: pixelAction.x,
                    minY: pixelAction.y,
                    maxX: pixelAction.x + pixelAction.width,
                    maxY: pixelAction.y + pixelAction.height,
                  },
                  indexes: [nextIndex],
                };
                renderHistoryToCache();
              } else {
                selectionRef.current = null;
              }
            }
          }

          redrawCanvas();
          updateStatus();
          return;
        }

        const stroke = currentStrokeRef.current;
        if (stroke) {
          if (stroke.points.length === 1) {
            const [x, y, pressure] = stroke.points[0];
            stroke.points.push([x + 0.01, y + 0.01, pressure]);
          }
          if (stroke.points.length > 1) {
            historyRef.current.push({ ...stroke, points: [...stroke.points] });
            redoHistoryRef.current = [];
            dirtyRef.current = true;
            updateStatus();
          }
        }
        currentStrokeRef.current = null;
        renderHistoryToCache();
        redrawCanvas();
      },
      [
        tool,
        splitActionBySelection,
        getCombinedBounds,
        renderHistoryToCache,
        redrawCanvas,
        updateStatus,
        createPixelSelectionAction,
      ]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      
      const preventTouch = (event) => {
        if (event.cancelable) event.preventDefault();
      };

      canvas.addEventListener('pointerdown', handlePointerDown, { passive: false, capture: true });
      canvas.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
      canvas.addEventListener('pointerup', finishCurrentStroke, { passive: false, capture: true });
      canvas.addEventListener('pointercancel', finishCurrentStroke, { passive: false, capture: true });
      canvas.addEventListener('pointerleave', finishCurrentStroke, { passive: false, capture: true });

      canvas.addEventListener('touchstart', preventTouch, { passive: false, capture: true });
      canvas.addEventListener('touchmove', preventTouch, { passive: false, capture: true });

      return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true });
        canvas.removeEventListener('pointermove', handlePointerMove, { capture: true });
        canvas.removeEventListener('pointerup', finishCurrentStroke, { capture: true });
        canvas.removeEventListener('pointercancel', finishCurrentStroke, { capture: true });
        canvas.removeEventListener('pointerleave', finishCurrentStroke, { capture: true });
        
        canvas.removeEventListener('touchstart', preventTouch, { capture: true });
        canvas.removeEventListener('touchmove', preventTouch, { capture: true });
      };
    }, [handlePointerDown, handlePointerMove, finishCurrentStroke]);

    useImperativeHandle(ref, () => ({
        undo: () => {
          const last = historyRef.current.pop();
          if (!last) return;
          selectionRef.current = null;
          selectionDraftRef.current = null;
          selectionDragRef.current = null;
          if (last.baseBeforeImgNode) {
            baseImageRef.current = last.baseBeforeImgNode;
          }
          redoHistoryRef.current.push(last);
          currentStrokeRef.current = null;
          dirtyRef.current = true;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
        redo: () => {
          const next = redoHistoryRef.current.pop();
          if (!next) return;
          selectionRef.current = null;
          selectionDraftRef.current = null;
          selectionDragRef.current = null;
          if (next.baseAfterImgNode) {
            baseImageRef.current = next.baseAfterImgNode;
          }
          historyRef.current.push(next);
          currentStrokeRef.current = null;
          dirtyRef.current = true;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
        toDataURL: (options = {}) => {
    const canvas = canvasRef.current;
    const historyCanvas = historyCanvasRef.current;
    if (!canvas || !historyCanvas) return '';

    // 1. Tạo canvas tạm thời
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 2. Set tỉ lệ scale cho đồng bộ (tránh ảnh bị lệch trên iPad/Mac)
    tempCtx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);

    // 3. CHỈ vẽ historyCanvas (lớp chứa các nét vẽ) vào canvas tạm
    // KHÔNG gọi drawPaperBackground ở đây
        if (options.excludeImages) {
      const baseImageNode = baseImageRef.current;

      if (baseImageNode) {
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.globalAlpha = 1;
        tempCtx.drawImage(baseImageNode, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }

      historyRef.current
        .filter((action) => action?.type !== 'image')
        .forEach((action) => drawAction(tempCtx, action));
    } else {
      tempCtx.drawImage(historyCanvas, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
    
    // 4. Trả về base64 dạng PNG trong suốt
    return tempCanvas.toDataURL('image/png');
  },
        getSceneData: () =>
          serializeSceneData(
            historyRef.current.filter((action) => action?.type === 'image'),
          ),
        getFullSceneData: () => serializeSceneData(historyRef.current),
        hasChanges: () => dirtyRef.current,
        getBaseImageDataURL: () => {
          const canvas = canvasRef.current;
          const baseImageNode = baseImageRef.current;
          if (!canvas || !baseImageNode) return '';

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
          tempCtx.drawImage(baseImageNode, 0, 0, canvas.offsetWidth, canvas.offsetHeight);

          return tempCanvas.toDataURL('image/png');
        },
        importImageFile: async (file) => {
          const canvas = canvasRef.current;
          if (!canvas || !file) return;
          const logicalRect = { width: canvas.offsetWidth, height: canvas.offsetHeight };
          const imageAction = await createImageActionFromFile(file, logicalRect);
          historyRef.current.push(imageAction);
          redoHistoryRef.current = [];
          currentStrokeRef.current = null;
          dirtyRef.current = true;
          renderHistoryToCache();
          redrawCanvas();
          updateStatus();
        },
      }),
      [renderHistoryToCache, redrawCanvas, updateStatus]
    );

    return (
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{
          touchAction: 'none',
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
