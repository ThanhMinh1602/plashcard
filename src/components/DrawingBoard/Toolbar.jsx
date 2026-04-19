import React from 'react';
import { COLORS, TOOLS } from '../../utils/constants';

export default function Toolbar({ activeTool, setActiveTool, color, setColor, size, setSize, opacity, setOpacity }) {
  return (
    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '15px', marginTop: '10px' }}>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(t.id)} style={{ background: activeTool === t.id ? '#007AFF' : '#fff', border: '1px solid #ddd', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        {COLORS.map(c => (
          <div key={c} onClick={() => setColor(c)} style={{ width: 25, height: 25, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #000' : 'none' }} />
        ))}
      </div>
      <input type="range" min="1" max="20" value={size} onChange={(e) => setSize(e.target.value)} /> Kích cỡ
      <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(e.target.value)} /> Độ đậm
    </div>
  );
}