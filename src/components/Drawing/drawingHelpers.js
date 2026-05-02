import { getStroke } from 'perfect-freehand';

export const CANVAS_SCALE =
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export const getDynamicStrokeOptions = (brushType, size) => {
  const safeSize = Math.max(Number(size) || 1, 1);

  const baseOptions = {
    size: safeSize,
    thinning: 0.45,
    smoothing: 0.78,
    streamline: 0.65,
    simulatePressure: true,
    easing: (t) => t,
    start: {
      taper: safeSize * 0.8,
      cap: true,
      easing: (t) => t * t,
    },
    end: {
      taper: safeSize * 1.6,
      cap: true,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    },
  };

  switch (brushType) {
    case 'pencil':
      return {
        ...baseOptions,
        size: safeSize * 0.9,
        thinning: 0.18,
        smoothing: 0.9,
        streamline: 0.72,
      };

    case 'marker':
      return {
        ...baseOptions,
        size: safeSize * 1.55,
        thinning: 0.03,
        smoothing: 0.86,
        streamline: 0.78,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      };

    case 'calligraphy':
      return {
        ...baseOptions,
        size: safeSize * 1.15,
        thinning: 0.82,
        smoothing: 0.88,
        streamline: 0.7,
        start: { taper: safeSize * 2.5, cap: true },
        end: { taper: safeSize * 2.5, cap: true },
      };

    case 'pen':
    default:
      return baseOptions;
  }
};

export const getSvgPathFromStroke = (strokePoints) => {
  if (!strokePoints?.length) return '';

  const max = strokePoints.length - 1;

  return strokePoints
    .reduce(
      (acc, point, index, arr) => {
        const [x0, y0] = point;
        const [x1, y1] = arr[index === max ? 0 : index + 1];

        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ['M', strokePoints[0][0], strokePoints[0][1], 'Q']
    )
    .concat('Z')
    .join(' ');
};

export const getStrokePathData = ({ points, brushType, size }) => {
  const strokePoints = getStroke(
    points,
    getDynamicStrokeOptions(brushType, size)
  );

  if (strokePoints.length < 2) return '';

  return getSvgPathFromStroke(strokePoints);
};

export const getPointerPressure = (event) => {
  if (event.pointerType === 'mouse') return 0.5;

  const pressure = Number(event.pressure) || 0.5;
  return Math.min(Math.max(pressure, 0.12), 1);
};

export const getDistance = (a, b) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];

  return Math.hypot(dx, dy);
};

export const appendSmoothPoint = (points, nextPoint) => {
  const lastPoint = points[points.length - 1];

  if (!lastPoint) {
    points.push(nextPoint);
    return;
  }

  const distance = getDistance(lastPoint, nextPoint);

  if (distance < 0.7) return;

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

export const drawGridPaperBackground = (
  context,
  {
    width,
    height,
    backgroundColor = '#ffffff',
    gridColor = 'rgba(100, 116, 139, 0.18)',
    gridSize = 24,
    bottomTintColor = '',
    bottomTintRows = 0,
  }
) => {
  context.save();

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  // Vùng màu dưới cùng, tính theo số ô nhỏ.
  // Ví dụ gridSize 24 và bottomTintRows 8 => cao 192px.
  if (bottomTintColor && bottomTintRows > 0) {
    const tintHeight = Math.min(height, gridSize * bottomTintRows);
    const tintY = height - tintHeight;

    context.fillStyle = bottomTintColor;
    context.fillRect(0, tintY, width, tintHeight);
  }

  // Chỉ vẽ ô nhỏ đều nhau, không vẽ viền đậm ô lớn.
  context.beginPath();
  context.strokeStyle = gridColor;
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += gridSize) {
    context.moveTo(Math.round(x) + 0.5, 0);
    context.lineTo(Math.round(x) + 0.5, height);
  }

  for (let y = 0; y <= height; y += gridSize) {
    context.moveTo(0, Math.round(y) + 0.5);
    context.lineTo(width, Math.round(y) + 0.5);
  }

  context.stroke();
  context.restore();
};

export const drawRuledPaperBackground = (
  context,
  {
    width,
    height,
    backgroundColor = '#ffffff',
    lineColor = 'rgba(148, 163, 184, 0.36)',
    marginLineColor = 'rgba(244, 114, 182, 0.34)',
    lineSpacing = 30,
    topPadding = 26,
    marginLeft = 46,
    showMargin = true,
  }
) => {
  context.save();

  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  context.beginPath();
  context.strokeStyle = lineColor;
  context.lineWidth = 1;

  for (let y = topPadding; y <= height; y += lineSpacing) {
    context.moveTo(0, Math.round(y) + 0.5);
    context.lineTo(width, Math.round(y) + 0.5);
  }

  context.stroke();

  if (showMargin) {
    context.beginPath();
    context.strokeStyle = marginLineColor;
    context.lineWidth = 1.2;
    context.moveTo(Math.round(marginLeft) + 0.5, 0);
    context.lineTo(Math.round(marginLeft) + 0.5, height);
    context.stroke();
  }

  context.restore();
};

export const loadImageNode = (src) => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const hydrateSceneData = async (sceneData) => {
  if (!sceneData) return [];

  let parsed = [];

  try {
    parsed = typeof sceneData === 'string' ? JSON.parse(sceneData) : sceneData;
  } catch (error) {
    console.error('Lỗi parse initialData:', error);
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const hydrated = await Promise.all(
    parsed.map(async (action) => {
      if (action?.type !== 'image' || !action.dataUrl) return action;

      const imgNode = await loadImageNode(action.dataUrl);
      return imgNode ? { ...action, imgNode } : action;
    })
  );

  return hydrated.filter(Boolean);
};

export const serializeSceneData = (actions) => {
  const dataToSave = actions.map((action) => {
    const copy = { ...action };
    delete copy.imgNode;
    return copy;
  });

  return JSON.stringify(dataToSave);
};

export const createImageActionFromFile = (file, canvasRect) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(
          (canvasRect.width * 0.9) / img.width,
          (canvasRect.height * 0.9) / img.height
        );

        const width = img.width * scale;
        const height = img.height * scale;
        const x = (canvasRect.width - width) / 2;
        const y = (canvasRect.height - height) / 2;

        resolve({
          type: 'image',
          dataUrl: event.target.result,
          x,
          y,
          width,
          height,
          imgNode: img,
        });
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};