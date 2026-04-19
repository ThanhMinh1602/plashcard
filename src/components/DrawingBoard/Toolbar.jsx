import React from 'react';
import { COLORS, TOOLS } from '../../utils/constants';
import './Toolbar.css';

export default function Toolbar({ activeTool, setActiveTool, color, setColor, size, setSize, opacity, setOpacity }) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <label className="toolbar-label">Công cụ</label>
        <div className="tools-grid">
          {TOOLS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTool(t.id)} 
              className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">Màu sắc</label>
        <div className="colors-grid">
          {COLORS.map(c => (
            <div 
              key={c} 
              onClick={() => setColor(c)} 
              className={`color-dot ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="slider-group">
          <label className="toolbar-label">Kích cỡ: <span className="value">{Math.round(size)}</span></label>
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={size} 
            onChange={(e) => setSize(e.target.value)}
            className="slider"
          />
        </div>
      </div>

      <div className="toolbar-section">
        <div className="slider-group">
          <label className="toolbar-label">Độ đậm: <span className="value">{Math.round(opacity * 100)}%</span></label>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={opacity} 
            onChange={(e) => setOpacity(e.target.value)}
            className="slider"
          />
        </div>
      </div>
    </div>
  );
}