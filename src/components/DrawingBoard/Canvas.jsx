import React, { useRef, useEffect, useState, forwardRef } from 'react';
import './Canvas.css';

const Canvas = forwardRef(({ tool, color, size, opacity }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Expose canvas ref
  useEffect(() => {
    if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (e.touches) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    
    return { offsetX, offsetY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = getCoordinates(e);
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

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
      className="canvas"
    />
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;