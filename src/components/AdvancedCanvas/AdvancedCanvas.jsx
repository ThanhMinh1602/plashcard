import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Stage, Layer, Group, Rect, Image as KonvaImage } from 'react-konva';
import { DOC_WIDTH, DOC_HEIGHT } from './constants';
import { deepClone, clamp, makeId, getContainRect, getStylusConfig, normalizeSceneData, readFileAsDataUrl } from './utils';
import { ShapeRenderer } from './ShapeRenderer';

function AdvancedCanvas(
  {
    initialImage = '',
    initialData = null,
    tool = 'brush',
    brushType = 'chinese-brush',
    color = '#000000',
    size = 4,
    opacity = 1,
    backgroundColor = '#ffffff',
    inputMode = 'stylusOnly',
    onStatusChange,
  },
  ref
) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  
  // History Refs
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);
  const snapshotRef = useRef(null);
  
  // Drawing Refs
  const drawingRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);

  // States
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scene, setScene] = useState(() => normalizeSceneData(initialImage, initialData));
  const [draftShape, setDraftShape] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [historyStep, setHistoryStep] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);

  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  useEffect(() => {
    onStatusChangeRef.current?.({ canUndo: historyStep > 0, canRedo: historyStep < historyLength - 1 });
  }, [historyStep, historyLength]);

  useEffect(() => {
    const nextScene = normalizeSceneData(initialImage, initialData);
    snapshotRef.current = nextScene;
    setScene(nextScene);
    setDraftShape(null);
    historyRef.current = [deepClone(nextScene)];
    historyStepRef.current = 0;
    setHistoryStep(0);
    setHistoryLength(1);
  }, [initialImage, initialData]);

  useEffect(() => { snapshotRef.current = scene; }, [scene]);

  useEffect(() => {
    let cancelled = false;
    if (!scene.backgroundSrc) {
      setBackgroundImage(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setBackgroundImage(img); };
    img.onerror = () => { if (!cancelled) setBackgroundImage(null); };
    img.src = scene.backgroundSrc;
    return () => { cancelled = true; };
  }, [scene.backgroundSrc]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;
      setDisplaySize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const getDocPointFromStage = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const { scale, offsetX, offsetY } = getContainRect(displaySize.width, displaySize.height);
    if (!scale) return null;
    return {
      x: clamp((pos.x - offsetX) / scale, 0, DOC_WIDTH),
      y: clamp((pos.y - offsetY) / scale, 0, DOC_HEIGHT),
    };
  };

  const commitHistory = (nextScene) => {
    const safeScene = deepClone(nextScene);
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);
    nextHistory.push(safeScene);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;
    snapshotRef.current = safeScene;
    setScene(safeScene);
    setHistoryStep(historyStepRef.current);
    setHistoryLength(nextHistory.length);
  };

  const restoreHistory = (index) => {
    const item = historyRef.current[index];
    if (!item) return;
    const safeScene = deepClone(item);
    historyStepRef.current = index;
    snapshotRef.current = safeScene;
    setScene(safeScene);
    setDraftShape(null);
    setHistoryStep(index);
    setHistoryLength(historyRef.current.length);
  };

  const undo = () => { if (historyStepRef.current > 0) restoreHistory(historyStepRef.current - 1); };
  const redo = () => { if (historyStepRef.current < historyRef.current.length - 1) restoreHistory(historyStepRef.current + 1); };

  const clearCanvas = () => {
    const nextScene = { elements: [], backgroundSrc: '', meta: { inputMode, version: 1 } };
    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  const beginStroke = (point, evt) => {
    const pressure = typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;
    const nextDraft = {
      id: makeId(), kind: 'freehand', tool, brushType, color, size, opacity,
      points: [{ x: point.x, y: point.y, pressure }, { x: point.x + 0.01, y: point.y + 0.01, pressure }],
    };
    drawingRef.current = { kind: 'freehand' };
    setDraftShape(nextDraft);
  };

  const handlePointerDown = (e) => {
    const evt = e.evt;
    const stylus = getStylusConfig(evt, inputMode);
    if (!stylus.allow) return;
    const point = getDocPointFromStage();
    if (!point) return;
    if (evt.cancelable) evt.preventDefault();

    if (tool === 'brush' || tool === 'eraser') {
      beginStroke(point, evt);
      return;
    }

    drawingRef.current = { kind: tool, startX: point.x, startY: point.y };
    setDraftShape({
      id: makeId(), kind: tool, color, size, opacity,
      ...(tool === 'line' && { x1: point.x, y1: point.y, x2: point.x, y2: point.y }),
      ...(tool === 'rectangle' && { x: point.x, y: point.y, width: 0, height: 0 }),
      ...(tool === 'circle' && { x: point.x, y: point.y, radius: 0 })
    });
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !draftShape) return;
    const evt = e.evt;
    const point = getDocPointFromStage();
    if (!point) return;
    if (evt.cancelable) evt.preventDefault();

    if (drawingRef.current.kind === 'freehand') {
      const pressure = typeof evt.pressure === 'number' && evt.pressure > 0 ? evt.pressure : 0.5;
      setDraftShape((prev) => {
        if (!prev) return prev;
        const lastPoint = prev.points[prev.points.length - 1];
        const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
        if (dist < 2.0) return prev;
        return { ...prev, points: [...prev.points, { x: point.x, y: point.y, pressure }] };
      });
      return;
    }

    setDraftShape((prev) => {
      if (!prev) return prev;
      if (drawingRef.current.kind === 'line') return { ...prev, x2: point.x, y2: point.y };
      if (drawingRef.current.kind === 'rectangle') return { ...prev, width: point.x - prev.x, height: point.y - prev.y };
      if (drawingRef.current.kind === 'circle') return { ...prev, radius: Math.hypot(point.x - prev.x, point.y - prev.y) };
      return prev;
    });
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current || !draftShape) return;
    if (e.evt?.cancelable) e.evt.preventDefault();
    const nextScene = {
      ...snapshotRef.current,
      elements: [...snapshotRef.current.elements, deepClone(draftShape)],
      meta: { ...(snapshotRef.current.meta || {}), inputMode, version: 1 },
    };
    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  const importImageFile = async (file) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const nextScene = {
      ...snapshotRef.current, backgroundSrc: dataUrl,
      meta: { ...(snapshotRef.current.meta || {}), inputMode, version: 1 },
    };
    drawingRef.current = null;
    setDraftShape(null);
    commitHistory(nextScene);
  };

  // Nâng cấp Export để chụp toàn bộ Stage theo tọa độ Crop
  const exportComposite = () => {
    const stage = stageRef.current;
    if (!stage || !displaySize.width || !displaySize.height) return '';
    const { scale, offsetX, offsetY } = getContainRect(displaySize.width, displaySize.height);
    
    // PixelRatio giúp ảnh xuất ra đúng với độ phân giải thật của DOC_WIDTH x DOC_HEIGHT
    const exportPixelRatio = 1 / scale; 

    return stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: DOC_WIDTH * scale,
      height: DOC_HEIGHT * scale,
      pixelRatio: exportPixelRatio,
    });
  };

  const exportImage = () => {
    const dataUrl = exportComposite();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = 'flashcard-face.png';
    link.href = dataUrl;
    link.click();
  };

  useImperativeHandle(ref, () => ({
    toDataURL: exportComposite,
    getSceneData: () => deepClone(snapshotRef.current),
    undo, redo, clear: clearCanvas, importImageFile, exportImage,
  }));

  const { scale, offsetX, offsetY } = getContainRect(displaySize.width, displaySize.height);

  const imageLayout = (() => {
    if (!backgroundImage) return null;
    const width = backgroundImage.width || DOC_WIDTH;
    const height = backgroundImage.height || DOC_HEIGHT;
    const fitScale = Math.min(DOC_WIDTH / width, DOC_HEIGHT / height);
    return {
      x: (DOC_WIDTH - width * fitScale) / 2,
      y: (DOC_HEIGHT - height * fitScale) / 2,
      width: width * fitScale,
      height: height * fitScale,
    };
  })();

  return (
    // Thêm CSS aspectRatio: '9/16' và margin auto để nó giữ tỉ lệ 16:9 dọc và căn giữa
    <div 
      ref={containerRef} 
      className="flex max-h-full min-h-0 min-w-0 overflow-hidden rounded-[inherit] bg-white mx-auto" 
      style={{ touchAction: 'none', aspectRatio: '9 / 16' }}
    >
      <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden rounded-[inherit] bg-white">
        {displaySize.width > 0 && displaySize.height > 0 && (
          <Stage
            ref={stageRef} width={displaySize.width} height={displaySize.height} className="h-full w-full bg-white"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp} onContextMenu={(e) => e.evt.preventDefault()}
          >
            {/* LAYER 1: Chỉ chứa Background. Cục tẩy ở Layer trên sẽ không chạm tới Layer này */}
            <Layer>
              <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
                <Rect x={0} y={0} width={DOC_WIDTH} height={DOC_HEIGHT} fill={backgroundColor} listening={false} />
                {backgroundImage && imageLayout && (
                  <KonvaImage image={backgroundImage} x={imageLayout.x} y={imageLayout.y} width={imageLayout.width} height={imageLayout.height} listening={false} />
                )}
              </Group>
            </Layer>

            <Layer>
              <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
                {scene.elements.map((shape) => <ShapeRenderer key={shape.id} shape={shape} />)}
                {draftShape && <ShapeRenderer shape={draftShape} />}
              </Group>
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}

export default forwardRef(AdvancedCanvas);