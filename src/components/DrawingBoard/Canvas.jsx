import React, { useRef, useEffect, useState } from 'react';

export default function Canvas({ tool, color, size, opacity }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    if (tool === 'dashed') ctx.setLineDash([size * 2, size * 2]);
    else if (tool === 'dotted') ctx.setLineDash([1, size * 2]);
    else if (tool === 'shadow') { ctx.shadowBlur = size; ctx.shadowColor = color; }
    else if (tool === 'brush') { ctx.globalAlpha = opacity * 0.5; ctx.lineWidth = size * 1.5; }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={(e) => { setIsDrawing(true); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }}
      onMouseMove={draw}
      onMouseUp={() => setIsDrawing(false)}
      onMouseLeave={() => setIsDrawing(false)}
      style={{ width: '100%', height: '100%', cursor: 'crosshair', backgroundColor: '#FEF9E7' }}
    />
  );
}