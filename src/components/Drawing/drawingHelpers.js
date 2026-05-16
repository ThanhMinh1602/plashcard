import { getStroke } from 'perfect-freehand';

export const CANVAS_SCALE =
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export const getDynamicStrokeOptions = (brushType, size) => {
  const safeSize = Math.max(Number(size) || 1, 1);

  const baseOptions = {
    size: safeSize,
    thinning: 0,
    smoothing: 0.92,   // tăng từ 0.85 → 0.92
    streamline: 0.92,  // tăng từ 0.85 → 0.92
    simulatePressure: false,
    last: true,        // ✅ thêm: buộc perfect-freehand tính điểm cuối chính xác
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  };

  switch (brushType) {
    case 'pencil':
      return {
        ...baseOptions,
        size: safeSize * 0.8,
        smoothing: 0.75,
        streamline: 0.75,
      };

    case 'marker':
      return {
        ...baseOptions,
        size: safeSize * 1.8,
        smoothing: 0.95,
        streamline: 0.95,
      };

    case 'calligraphy':
      return {
        ...baseOptions,
        size: safeSize * 1.2,
        thinning: 0.55,       // giảm từ 0.85 → 0.55: tránh nét thu hẹp quá mức gây đứt
        smoothing: 0.96,      // tăng tối đa để uốn lượn mượt
        streamline: 0.96,
        simulatePressure: true, // bật lại simulate để áp lực thay đổi từ từ, không giật cục
        start: { taper: safeSize * 1.5, cap: true },
        end: { taper: safeSize * 1.5, cap: true },
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

// ✅ FIX CHÍNH: Thêm exponential smoothing để làm mịn tọa độ trước khi lưu
// Thay vì nội suy thẳng, dùng EMA (Exponential Moving Average) để điểm mới
// bị "kéo" về phía điểm cũ → loại bỏ gấp khúc do rung tay hoặc sampling thưa.
// EMA alpha: 0 = bám sát lịch sử (mượt nhất), 1 = không làm mịn
// 0.30 cân bằng tốt giữa độ mượt và độ bám nét thực tế
const SMOOTH_ALPHA = 0.30;

export const appendSmoothPoint = (points, nextPoint) => {
  const lastPoint = points[points.length - 1];

  if (!lastPoint) {
    points.push(nextPoint);
    return;
  }

  const distance = getDistance(lastPoint, nextPoint);

  // Bỏ qua điểm quá gần (giảm từ 0.7 → 1.0 để bớt noise)
  if (distance < 1.0) return;

  // Áp dụng EMA: smoothedPoint = alpha * next + (1-alpha) * last
  const smoothed = [
    SMOOTH_ALPHA * nextPoint[0] + (1 - SMOOTH_ALPHA) * lastPoint[0],
    SMOOTH_ALPHA * nextPoint[1] + (1 - SMOOTH_ALPHA) * lastPoint[1],
    nextPoint[2], // áp lực giữ nguyên
  ];

  // Với khoảng cách lớn: nội suy thêm điểm trung gian để không bị "nhảy cóc"
  if (distance > 8) {
    const steps = Math.min(6, Math.floor(distance / 4));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      points.push([
        lastPoint[0] + (smoothed[0] - lastPoint[0]) * t,
        lastPoint[1] + (smoothed[1] - lastPoint[1]) * t,
        lastPoint[2] + (smoothed[2] - lastPoint[2]) * t,
      ]);
    }
  }

  points.push(smoothed);
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

  if (bottomTintColor && bottomTintRows > 0) {
    const tintHeight = Math.min(height, gridSize * bottomTintRows);
    const tintY = height - tintHeight;

    context.fillStyle = bottomTintColor;
    context.fillRect(0, tintY, width, tintHeight);
  }

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
    delete copy.baseBeforeImgNode;
    delete copy.baseAfterImgNode;
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
