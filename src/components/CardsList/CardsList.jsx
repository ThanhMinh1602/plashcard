import React, { useEffect, useRef, useState } from 'react';
import {
  getFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  updatePackage,
} from '../../services/flashcardService';
import AdvancedCanvas from '../AdvancedCanvas/AdvancedCanvas';
import './CardsList.css';

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

const createLocalCard = (card = {}) => ({
  localId:
    card.localId ||
    `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  id: card.id || null,
  front: card.front || '',
  back: card.back || '',
});

export default function CardsList({
  user,
  packageItem,
  onBack,
  onPackageUpdated,
}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [packageName, setPackageName] = useState(packageItem?.name || '');
  const [packageDescription, setPackageDescription] = useState(
    packageItem?.description || ''
  );

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [packageTouched, setPackageTouched] = useState(false);
  const [nameError, setNameError] = useState('');

  const [toolbox, setToolbox] = useState(DEFAULT_TOOLBOX);
  const [activeCanvasKey, setActiveCanvasKey] = useState(null);
  const [canvasStatusMap, setCanvasStatusMap] = useState({});

  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const canvasRefs = useRef({});

  const canAddCard = packageName.trim().length > 0;
  const activeCanvasRef = activeCanvasKey ? canvasRefs.current[activeCanvasKey] : null;
  const activeStatus = canvasStatusMap[activeCanvasKey] || DEFAULT_STATUS;
  const isBrushTool = toolbox.tool === 'brush';

  useEffect(() => {
    setPackageName(packageItem?.name || '');
    setPackageDescription(packageItem?.description || '');
    setNameError('');
    setError('');
    setSaveMessage('');
    setPackageTouched(false);
    setCards([]);
    setActiveCanvasKey(null);
    setCanvasStatusMap({});
    initialSyncDoneRef.current = false;

    const raf = requestAnimationFrame(() => {
      initialSyncDoneRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [packageItem?.id]);

  useEffect(() => {
    loadCards();
  }, [user, packageItem?.id]);

  useEffect(() => {
    if (!user || !packageItem?.id) return;
    if (!initialSyncDoneRef.current) return;
    if (!packageTouched) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        await updatePackage(user.uid, packageItem.id, packageName, packageDescription);

        onPackageUpdated?.({
          ...packageItem,
          name: packageName,
          description: packageDescription,
        });

        if (packageName.trim()) {
          setNameError('');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi tự động lưu thông tin gói');
      } finally {
        setIsAutoSaving(false);
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    packageName,
    packageDescription,
    packageTouched,
    user?.uid,
    packageItem?.id,
    onPackageUpdated,
  ]);

  useEffect(() => {
    if (!cards.length) {
      setActiveCanvasKey(null);
      return;
    }

    const exists = cards.some(
      (item) =>
        `${item.localId}-front` === activeCanvasKey ||
        `${item.localId}-back` === activeCanvasKey
    );

    if (!exists) {
      setActiveCanvasKey(`${cards[0].localId}-front`);
    }
  }, [cards, activeCanvasKey]);

  const loadCards = async () => {
    if (!user || !packageItem?.id) return;

    try {
      setLoading(true);
      setError('');
      const userCards = await getFlashcards(user.uid, packageItem.id);
      const normalized = userCards.map((item) =>
        createLocalCard({
          localId: item.id,
          id: item.id,
          front: item.front,
          back: item.back,
        })
      );
      setCards(normalized);
    } catch (err) {
      console.error('Lỗi load cards:', err);
      setError('Lỗi tải danh sách thẻ');
    } finally {
      setLoading(false);
    }
  };

  const setCanvasRef = (key) => (instance) => {
    if (instance) {
      canvasRefs.current[key] = instance;
    } else {
      delete canvasRefs.current[key];
    }
  };

  const handleCanvasStatusChange = (key) => (status) => {
    setCanvasStatusMap((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || DEFAULT_STATUS),
        ...status,
      },
    }));
  };

  const handleNameChange = (e) => {
    setPackageName(e.target.value);
    setPackageTouched(true);

    if (e.target.value.trim()) {
      setNameError('');
    }
  };

  const handleDescriptionChange = (e) => {
    setPackageDescription(e.target.value);
    setPackageTouched(true);
  };

  const handleAddCardPair = () => {
    setError('');
    setSaveMessage('');

    if (!canAddCard) {
      setNameError('Bạn phải nhập tên gói trước khi thêm cặp thẻ');
      nameInputRef.current?.focus();
      return;
    }

    const newCard = createLocalCard();
    setCards((prev) => [...prev, newCard]);
    setActiveCanvasKey(`${newCard.localId}-front`);
  };

  const handleDeleteCardPair = async (localId) => {
    const target = cards.find((item) => item.localId === localId);
    if (!target) return;

    const confirmed = window.confirm('Bạn có chắc muốn xóa cặp thẻ này không?');
    if (!confirmed) return;

    try {
      if (target.id) {
        await deleteFlashcard(user.uid, packageItem.id, target.id);
      }

      delete canvasRefs.current[`${localId}-front`];
      delete canvasRefs.current[`${localId}-back`];

      setCanvasStatusMap((prev) => {
        const next = { ...prev };
        delete next[`${localId}-front`];
        delete next[`${localId}-back`];
        return next;
      });

      setCards((prev) => prev.filter((item) => item.localId !== localId));
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa cặp thẻ');
    }
  };

  const handleImportClick = () => {
    if (!activeCanvasRef) {
      setError('Hãy chạm vào một mặt thẻ trước khi import ảnh');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await activeCanvasRef?.importImageFile?.(file);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveAll = async () => {
    if (!user || !packageItem?.id) return;

    setError('');
    setSaveMessage('');

    if (!packageName.trim()) {
      setNameError('Bạn phải nhập tên gói trước khi lưu thẻ');
      nameInputRef.current?.focus();
      return;
    }

    try {
      setSavingAll(true);

      await updatePackage(user.uid, packageItem.id, packageName, packageDescription);

      onPackageUpdated?.({
  name: packageName,
  description: packageDescription,
});

      const nextCards = [];

      for (const item of cards) {
        const frontRef = canvasRefs.current[`${item.localId}-front`];
        const backRef = canvasRefs.current[`${item.localId}-back`];

        const front = frontRef?.toDataURL?.() || item.front || '';
        const back = backRef?.toDataURL?.() || item.back || '';

        if (item.id) {
          await updateFlashcard(user.uid, packageItem.id, item.id, front, back);
          nextCards.push({
            ...item,
            front,
            back,
          });
        } else {
          const newId = await addFlashcard(user.uid, packageItem.id, front, back);
          nextCards.push({
            ...item,
            id: newId,
            front,
            back,
          });
        }
      }

      setCards(nextCards);
      setSaveMessage('Đã lưu toàn bộ cặp thẻ');
    } catch (err) {
      console.error(err);
      setError('Lỗi lưu cặp thẻ');
    } finally {
      setSavingAll(false);
    }
  };

  const getActiveCanvasLabel = () => {
    if (!activeCanvasKey) return 'Chưa chọn mặt thẻ';

    const face = activeCanvasKey.endsWith('-front') ? 'front' : 'back';
    const localId = activeCanvasKey.replace(/-(front|back)$/, '');
    const index = cards.findIndex((item) => item.localId === localId);

    if (index === -1) return 'Chưa chọn mặt thẻ';

    return `Đang chọn: Cặp ${index + 1} - ${face === 'front' ? 'Mặt trước' : 'Mặt sau'}`;
  };

  const renderToolbar = () => (
    <div className="inline-editor-toolbar">
      <div className="advanced-topbar-group">
        <button
          type="button"
          className="editor-btn"
          onClick={() => activeCanvasRef?.undo?.()}
          disabled={!activeCanvasRef || !activeStatus.canUndo}
        >
          ↶ Undo
        </button>
        <button
          type="button"
          className="editor-btn"
          onClick={() => activeCanvasRef?.redo?.()}
          disabled={!activeCanvasRef || !activeStatus.canRedo}
        >
          ↷ Redo
        </button>
      </div>

      <div
        className={`advanced-topbar-group tools-group brush-type-group ${isBrushTool ? 'open' : 'closed'
          }`}
        aria-hidden={!isBrushTool}
      >
        {BRUSH_TYPES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            className={`tool-icon-btn compact brush-type-btn ${toolbox.brushType === item.id ? 'active' : ''
              }`}
            onClick={() => setToolbox((prev) => ({ ...prev, brushType: item.id }))}
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
            className={`tool-icon-btn compact ${toolbox.tool === item.id ? 'active' : ''}`}
            onClick={() => setToolbox((prev) => ({ ...prev, tool: item.id }))}
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
          value={toolbox.color}
          onChange={(e) =>
            setToolbox((prev) => ({
              ...prev,
              color: e.target.value,
            }))
          }
          className="color-input"
        />
      </div>

      <div className="advanced-topbar-group">
        <label className="editor-label">Size {toolbox.size}px</label>
        <input
          type="range"
          min="1"
          max="80"
          value={toolbox.size}
          onChange={(e) =>
            setToolbox((prev) => ({
              ...prev,
              size: Number(e.target.value),
            }))
          }
          className="editor-slider"
        />
      </div>

      <div className="advanced-topbar-group">
        <label className="editor-label">
          Opacity {Math.round(toolbox.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={toolbox.opacity}
          onChange={(e) =>
            setToolbox((prev) => ({
              ...prev,
              opacity: Number(e.target.value),
            }))
          }
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
          onClick={() => activeCanvasRef?.exportImage?.()}
          disabled={!activeCanvasRef}
        >
          💾 Export
        </button>
        <button
          type="button"
          className="editor-btn"
          onClick={() => activeCanvasRef?.clear?.()}
          disabled={!activeCanvasRef}
        >
          🗑 Clear
        </button>
      </div>

      <div className="advanced-topbar-group active-canvas-badge-wrap">
        <span className="active-canvas-badge">{getActiveCanvasLabel()}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImportChange}
        hidden
      />
    </div>
  );

  if (loading) {
    return (
      <div className="cards-list-container">
        <div className="loading">Đang tải gói thẻ...</div>
      </div>
    );
  }

  return (
    <div className="cards-list-container">
      <div className="cards-package-panel">
        <div className="cards-package-top">
          <button className="edit-page-btn" onClick={onBack}>
            ← Quay lại gói
          </button>

          <div className="cards-package-status">
            {isAutoSaving ? (
              <span className="autosave-badge saving">Đang lưu tên gói...</span>
            ) : (
              <span className="autosave-badge saved">Tên gói đã lưu tự động</span>
            )}
          </div>

          <div className="cards-package-actions">
            <button className="btn-add-card" onClick={handleAddCardPair}>
              ➕ Thêm cặp thẻ
            </button>
            <button
              className="btn-save-all"
              onClick={handleSaveAll}
              disabled={savingAll}
            >
              {savingAll ? 'Đang lưu...' : '💾 Lưu tất cả'}
            </button>
          </div>
        </div>

        <div className="cards-package-form">
          <div className="cards-package-field">
            <label>
              Tên gói <span className="required-mark">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={packageName}
              onChange={handleNameChange}
              placeholder="Ví dụ: Từ vựng IELTS, Sinh học 12..."
            />
            {nameError && <div className="field-error">{nameError}</div>}
          </div>

          <div className="cards-package-field">
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={packageDescription}
              onChange={handleDescriptionChange}
              placeholder="Nhập mô tả cho gói"
            />
          </div>
        </div>
      </div>

      {renderToolbar()}

      {error && <div className="error-message">{error}</div>}
      {saveMessage && <div className="success-message-inline">{saveMessage}</div>}

      {cards.length === 0 ? (
        <div className="empty-state large-empty-state">
          <p>📝 Gói này chưa có cặp thẻ nào</p>
          <p>
            {canAddCard
              ? 'Nhấn "Thêm cặp thẻ" để bắt đầu'
              : 'Hãy nhập tên gói trước, sau đó thêm cặp thẻ'}
          </p>
        </div>
      ) : (
        <div className="pair-list">
          {cards.map((item, index) => {
            const frontKey = `${item.localId}-front`;
            const backKey = `${item.localId}-back`;

            return (
              <div key={item.localId} className="pair-card">
                <button
                  className="pair-delete-icon"
                  onClick={() => handleDeleteCardPair(item.localId)}
                  type="button"
                  aria-label={`Xóa cặp thẻ ${index + 1}`}
                  title="Xóa cặp thẻ"
                >
                  ×
                </button>

                <div className="pair-card-title">
                  <h3>Cặp thẻ {index + 1}</h3>
                </div>

                <div className="pair-grid">
                  <div
                    className={`face-editor-panel ${activeCanvasKey === frontKey ? 'active' : ''
                      }`}
                    onMouseDown={() => setActiveCanvasKey(frontKey)}
                    onTouchStart={() => setActiveCanvasKey(frontKey)}
                  >
                    <div className="face-editor-title">Mặt trước</div>
                    <div className="face-editor-canvas">
                      <AdvancedCanvas
                        ref={setCanvasRef(frontKey)}
                        initialImage={item.front || ''}
                        tool={toolbox.tool}
                        brushType={toolbox.brushType}
                        color={toolbox.color}
                        size={toolbox.size}
                        opacity={toolbox.opacity}
                        onStatusChange={handleCanvasStatusChange(frontKey)}
                      />
                    </div>
                  </div>

                  <div
                    className={`face-editor-panel ${activeCanvasKey === backKey ? 'active' : ''
                      }`}
                    onMouseDown={() => setActiveCanvasKey(backKey)}
                    onTouchStart={() => setActiveCanvasKey(backKey)}
                  >
                    <div className="face-editor-title">Mặt sau</div>
                    <div className="face-editor-canvas">
                      <AdvancedCanvas
                        ref={setCanvasRef(backKey)}
                        initialImage={item.back || ''}
                        tool={toolbox.tool}
                        brushType={toolbox.brushType}
                        color={toolbox.color}
                        size={toolbox.size}
                        opacity={toolbox.opacity}
                        onStatusChange={handleCanvasStatusChange(backKey)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button className="btn-add-pair-large" onClick={handleAddCardPair}>
            ➕ Thêm cặp thẻ mới
          </button>
        </div>
      )}
    </div>
  );
}