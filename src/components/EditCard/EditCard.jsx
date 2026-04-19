import React, { useRef, useState } from 'react';
import { addFlashcard, updateFlashcard } from '../../services/flashcardService';
import AdvancedCanvas from '../AdvancedCanvas/AdvancedCanvas';
import './EditCard.css';

const TOOL_LIST = [
    { id: 'brush', icon: '🖌️', label: 'Brush' },
    { id: 'eraser', icon: '🧽', label: 'Eraser' },
    { id: 'line', icon: '📏', label: 'Line' },
    { id: 'rectangle', icon: '▭', label: 'Rectangle' },
    { id: 'circle', icon: '⭕', label: 'Circle' },
];

const BRUSH_TYPES = [
    { id: 'pen', icon: '✒️', label: 'Pen' },
    { id: 'pencil', icon: '✏️', label: 'Pencil' },
    { id: 'marker', icon: '🖍️', label: 'Marker' },
    { id: 'calligraphy', icon: '🪶', label: 'Calligraphy' },
];

const DEFAULT_TOOLBOX = {
    tool: 'brush',
    brushType: 'pen',
    color: '#000000',
    size: 4,
    opacity: 1,
};

const DEFAULT_STATUS = {
    canUndo: false,
    canRedo: false,
};

export default function EditCard({
    user,
    packageItem,
    card,
    onBack,
    onCardSaved,
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isFlipped, setIsFlipped] = useState(false);

    const [frontToolbox, setFrontToolbox] = useState(DEFAULT_TOOLBOX);
    const [backToolbox, setBackToolbox] = useState(DEFAULT_TOOLBOX);

    const [frontStatus, setFrontStatus] = useState(DEFAULT_STATUS);
    const [backStatus, setBackStatus] = useState(DEFAULT_STATUS);

    const frontRef = useRef(null);
    const backRef = useRef(null);
    const fileInputRef = useRef(null);

    const activeRef = isFlipped ? backRef : frontRef;
    const activeToolbox = isFlipped ? backToolbox : frontToolbox;
    const activeStatus = isFlipped ? backStatus : frontStatus;
    const isBrushTool = activeToolbox.tool === 'brush';

    const setActiveToolbox = (patch) => {
        if (isFlipped) {
            setBackToolbox((prev) => ({ ...prev, ...patch }));
        } else {
            setFrontToolbox((prev) => ({ ...prev, ...patch }));
        }
    };

    const handleStatusChange = (face) => (status) => {
        if (face === 'front') {
            setFrontStatus((prev) => ({ ...prev, ...status }));
        } else {
            setBackStatus((prev) => ({ ...prev, ...status }));
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await activeRef.current?.importImageFile?.(file);
        } finally {
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!user || !packageItem?.id || !packageItem?.name?.trim()) {
            setError('Bạn cần nhập tên gói trước khi lưu card');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const front = frontRef.current?.toDataURL?.() || '';
            const back = backRef.current?.toDataURL?.() || '';

            if (card?.id) {
                await updateFlashcard(user.uid, packageItem.id, card.id, front, back);
            } else {
                await addFlashcard(user.uid, packageItem.id, front, back);
            }

            onCardSaved?.();
            onBack?.();
        } catch (err) {
            console.error(err);
            setError(`Lỗi lưu thẻ: ${err.message || 'Không xác định'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edit-card-page">
            <div className="edit-card-top">
                <div className="edit-card-top-left">
                    <button className="edit-page-btn" onClick={onBack} disabled={loading}>
                        ← Quay lại
                    </button>
                    <h2>
                        {card?.id ? 'Sửa Flashcard' : 'Tạo Flashcard'}
                        {packageItem?.name ? ` • ${packageItem.name}` : ''}
                    </h2>
                </div>

                <div className="edit-card-top-right">
                    <button className="edit-page-btn primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Đang lưu...' : '💾 Lưu thẻ'}
                    </button>
                </div>
            </div>

            <div className="edit-card-toolbar">
                <div className="advanced-topbar-group">
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => activeRef.current?.undo?.()}
                        disabled={!activeStatus.canUndo}
                    >
                        ↶ Undo
                    </button>
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => activeRef.current?.redo?.()}
                        disabled={!activeStatus.canRedo}
                    >
                        ↷ Redo
                    </button>
                </div>

                <div
                    className={`advanced-topbar-group tools-group brush-type-group ${isBrushTool ? 'open' : 'closed'}`}
                    aria-hidden={!isBrushTool}
                >
                    {BRUSH_TYPES.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            title={item.label}
                            className={`tool-icon-btn compact brush-type-btn ${activeToolbox.brushType === item.id ? 'active' : ''
                                }`}
                            onClick={() => setActiveToolbox({ brushType: item.id })}
                            style={{ '--item-index': index }}
                            disabled={!isBrushTool}
                            tabIndex={isBrushTool ? 0 : -1}
                        >
                            <span>{item.icon}</span>
                            <small>{item.label}</small>
                        </button>
                    ))}
                </div>

                <div className="advanced-topbar-group tools-group">
                    {TOOL_LIST.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            title={item.label}
                            className={`tool-icon-btn compact ${activeToolbox.tool === item.id ? 'active' : ''}`}
                            onClick={() => setActiveToolbox({ tool: item.id })}
                        >
                            <span>{item.icon}</span>
                            <small>{item.label}</small>
                        </button>
                    ))}
                </div>

                <div className="advanced-topbar-group">
                    <label className="editor-label">Color</label>
                    <input
                        type="color"
                        value={activeToolbox.color}
                        onChange={(e) => setActiveToolbox({ color: e.target.value })}
                        className="color-input"
                    />
                </div>

                <div className="advanced-topbar-group">
                    <label className="editor-label">Size {activeToolbox.size}px</label>
                    <input
                        type="range"
                        min="1"
                        max="80"
                        value={activeToolbox.size}
                        onChange={(e) => setActiveToolbox({ size: Number(e.target.value) })}
                        className="editor-slider"
                    />
                </div>

                <div className="advanced-topbar-group">
                    <label className="editor-label">
                        Opacity {Math.round(activeToolbox.opacity * 100)}%
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={activeToolbox.opacity}
                        onChange={(e) => setActiveToolbox({ opacity: Number(e.target.value) })}
                        className="editor-slider"
                    />
                </div>

                <div className="advanced-topbar-group">
                    <button type="button" className="editor-btn" onClick={handleImportClick}>
                        📂 Import
                    </button>
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => activeRef.current?.exportImage?.()}
                    >
                        💾 Export
                    </button>
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => activeRef.current?.clear?.()}
                    >
                        🗑 Clear
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImportChange}
                    hidden
                />
            </div>

            {error && <div className="edit-card-error">{error}</div>}

            <div className="edit-card-editor-area">
                <div className="edit-card-flip-scene">
                    <div className="edit-card-face-switcher">
                        <button
                            className={`face-btn ${!isFlipped ? 'active' : ''}`}
                            onClick={() => setIsFlipped(false)}
                            type="button"
                        >
                            Mặt trước
                        </button>
                        <button
                            className={`face-btn ${isFlipped ? 'active' : ''}`}
                            onClick={() => setIsFlipped(true)}
                            type="button"
                        >
                            Mặt sau
                        </button>
                    </div>

                    <div className={`edit-card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
                        <div className="edit-card-canvas-face front">
                            <AdvancedCanvas
                                ref={frontRef}
                                initialImage={card?.front || ''}
                                tool={frontToolbox.tool}
                                brushType={frontToolbox.brushType}
                                color={frontToolbox.color}
                                size={frontToolbox.size}
                                opacity={frontToolbox.opacity}
                                onStatusChange={handleStatusChange('front')}
                            />
                        </div>

                        <div className="edit-card-canvas-face back">
                            <AdvancedCanvas
                                ref={backRef}
                                initialImage={card?.back || ''}
                                tool={backToolbox.tool}
                                brushType={backToolbox.brushType}
                                color={backToolbox.color}
                                size={backToolbox.size}
                                opacity={backToolbox.opacity}
                                onStatusChange={handleStatusChange('back')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}