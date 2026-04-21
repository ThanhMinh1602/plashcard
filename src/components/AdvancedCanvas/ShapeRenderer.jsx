import React from 'react';
import { Path, Line, Rect, Circle } from 'react-konva';
import { getStrokePathData } from './brushUtils';

export function ShapeRenderer({ shape }) {
  if (!shape) return null;

  if (shape.kind === 'freehand') {
    const pathData = getStrokePathData(shape.points, shape.brushType || 'chinese-brush', shape.size || 4);
    if (!pathData) return null;

    const isEraser = shape.tool === 'eraser';
    let fillOpacity = shape.opacity ?? 1;
    
    if (!isEraser && shape.brushType === 'pencil') {
      fillOpacity = Math.min(1, fillOpacity * 0.58);
    }
    if (!isEraser && shape.brushType === 'marker') {
      fillOpacity = Math.min(1, fillOpacity * 0.32);
    }

    return (
      <Path
        data={pathData}
        fill={isEraser ? '#000000' : shape.color}
        opacity={isEraser ? 1 : fillOpacity}
        globalCompositeOperation={isEraser ? 'destination-out' : 'source-over'}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'line') {
    return (
      <Line
        points={[shape.x1 || 0, shape.y1 || 0, shape.x2 || 0, shape.y2 || 0]}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'rectangle') {
    return (
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  if (shape.kind === 'circle') {
    return (
      <Circle
        x={shape.x}
        y={shape.y}
        radius={shape.radius}
        stroke={shape.color}
        strokeWidth={shape.size}
        opacity={shape.opacity}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return null;
}