import React, { useEffect, useRef, useState } from 'react';
import ConfirmModal from '../Common/ConfirmModal';
import {
  FiArrowLeft,
  FiCircle,
  FiDownload,
  FiEdit2,
  FiMinus,
  FiPenTool,
  FiPlus,
  FiSave,
  FiSquare,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { BsEraser } from 'react-icons/bs';
import { GiFeather } from 'react-icons/gi';
import { MdBrush } from 'react-icons/md';
import { PiPencilSimpleLineBold } from 'react-icons/pi';
import { RiMarkPenLine } from 'react-icons/ri';
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
  { id: 'brush', icon: MdBrush, label: 'Brush' },
  { id: 'eraser', icon: BsEraser, label: 'Eraser' },
  { id: 'line', icon: FiMinus, label: 'Line' },
  { id: 'rectangle', icon: FiSquare, label: 'Rectangle' },
  { id: 'circle', icon: FiCircle, label: 'Circle' },
];

const BRUSH_TYPES = [
  { id: 'pen', icon: FiPenTool, label: 'Pen' },
  { id: 'pencil', icon: PiPencilSimpleLineBold, label: 'Pencil' },
  { id: 'marker', icon: RiMarkPenLine, label: 'Marker' },
  { id: 'calligraphy', icon: GiFeather, label: 'Calligraphy' },
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

const FRONT_PAPER_COLOR = '#f8f1dd';
const BACK_PAPER_COLOR = '#ead9ad';

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
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [packageName, setPackageName] = useState(packageItem?.name || '');
  const [packageDescription, setPackageDescription] = useState(
    packageItem?.description || ''
  );
  const [debouncedPackageName, setDebouncedPackageName] = useState(
    packageItem?.name || ''
  );
  const [debouncedPackageDescription, setDebouncedPackageDescription] = useState(
    packageItem?.description || ''
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [draftPackageName, setDraftPackageName] = useState(
    packageItem?.name || ''
  );

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [packageTouched, setPackageTouched] = useState(false);
  const [nameError, setNameError] = useState('');

  const [toolbox, setToolbox] = useState(DEFAULT_TOOLBOX);
  const [activeCanvasKey, setActiveCanvasKey] = useState(null);
  const [canvasStatusMap, setCanvasStatusMap] = useState({});

  const headerNameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const canvasRefs = useRef({});
  const pairCardRefs = useRef({});
  const pendingScrollToCardRef = useRef(null);
  const lastSavedPackageRef = useRef({
    name: packageItem?.name || '',
    description: packageItem?.description || '',
  });
  const packageItemRef = useRef(packageItem);
  const onPackageUpdatedRef = useRef(onPackageUpdated);

  const canAddCard = packageName.trim().length > 0;
  const activeCanvasRef = activeCanvasKey
    ? canvasRefs.current[activeCanvasKey]
    : null;
  const activeStatus = canvasStatusMap[activeCanvasKey] || DEFAULT_STATUS;
  const isBrushTool = toolbox.tool === 'brush';

  useEffect(() => {
    packageItemRef.current = packageItem;
  }, [packageItem]);

  useEffect(() => {
    onPackageUpdatedRef.current = onPackageUpdated;
  }, [onPackageUpdated]);

  useEffect(() => {
    setPackageName(packageItem?.name || '');
    setPackageDescription(packageItem?.description || '');
    setDebouncedPackageName(packageItem?.name || '');
    setDebouncedPackageDescription(packageItem?.description || '');
    setDraftPackageName(packageItem?.name || '');
    setIsEditingName(false);
    setNameError('');
    setError('');
    setSaveMessage('');
    setPackageTouched(false);
    setCards([]);
    setActiveCanvasKey(null);
    setCanvasStatusMap({});
    pairCardRefs.current = {};
    pendingScrollToCardRef.current = null;
    lastSavedPackageRef.current = {
      name: packageItem?.name || '',
      description: packageItem?.description || '',
    };
    initialSyncDoneRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const raf = requestAnimationFrame(() => {
      initialSyncDoneRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [packageItem?.id]);

  useEffect(() => {
    loadCards();
  }, [user, packageItem?.id]);

  useEffect(() => {
    if (!packageTouched) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedPackageName(packageName);
      setDebouncedPackageDescription(packageDescription);
    }, 700);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [packageName, packageDescription, packageTouched]);

  useEffect(() => {
    if (!user || !packageItem?.id) return;
    if (!initialSyncDoneRef.current) return;
    if (!packageTouched) return;

    const lastSaved = lastSavedPackageRef.current;
    if (
      debouncedPackageName === lastSaved.name &&
      debouncedPackageDescription === lastSaved.description
    ) {
      return;
    }

    let cancelled = false;

    const autoSavePackage = async () => {
      try {
        setIsAutoSaving(true);
        setError('');

        await updatePackage(
          user.uid,
          packageItem.id,
          debouncedPackageName,
          debouncedPackageDescription
        );

        if (cancelled) return;

        lastSavedPackageRef.current = {
          name: debouncedPackageName,
          description: debouncedPackageDescription,
        };

        onPackageUpdatedRef.current?.({
          ...packageItemRef.current,
          name: debouncedPackageName,
          description: debouncedPackageDescription,
        });

        if (debouncedPackageName.trim()) {
          setNameError('');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Lỗi tự động lưu tên gói');
        }
      } finally {
        if (!cancelled) {
          setIsAutoSaving(false);
        }
      }
    };

    autoSavePackage();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedPackageName,
    debouncedPackageDescription,
    packageTouched,
    user?.uid,
    packageItem?.id,
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

  useEffect(() => {
    const targetLocalId = pendingScrollToCardRef.current;
    if (!targetLocalId) return;

    const targetNode = pairCardRefs.current[targetLocalId];
    if (!targetNode) return;

    const raf = requestAnimationFrame(() => {
      targetNode.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    pendingScrollToCardRef.current = null;

    return () => cancelAnimationFrame(raf);
  }, [cards]);

  useEffect(() => {
    if (!isEditingName) return;

    const raf = requestAnimationFrame(() => {
      headerNameInputRef.current?.focus();
      headerNameInputRef.current?.select();
    });

    return () => cancelAnimationFrame(raf);
  }, [isEditingName]);

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

  const setPairCardRef = (localId) => (node) => {
    if (node) {
      pairCardRefs.current[localId] = node;
    } else {
      delete pairCardRefs.current[localId];
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

  const openNameEditor = () => {
    setDraftPackageName(packageName || '');
    setIsEditingName(true);
    setNameError('');
  };

  const saveHeaderName = () => {
    const nextName = draftPackageName.trim();
    setPackageName(nextName);
    setPackageTouched(true);

    if (nextName) {
      setNameError('');
    }

    setIsEditingName(false);
  };

  const cancelHeaderNameEdit = () => {
    setDraftPackageName(packageName || '');
    setIsEditingName(false);
  };

  const handleHeaderNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveHeaderName();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelHeaderNameEdit();
    }
  };

  const ensurePackageName = (message) => {
    if (packageName.trim()) return true;

    setNameError(message);
    setDraftPackageName(packageName || '');
    setIsEditingName(true);
    return false;
  };

  const handleAddCardPair = () => {
    setError('');
    setSaveMessage('');

    if (!ensurePackageName('Bạn phải nhập tên gói trước khi thêm thẻ')) {
      return;
    }

    const newCard = createLocalCard();
    pendingScrollToCardRef.current = newCard.localId;
    setCards((prev) => [...prev, newCard]);
    setActiveCanvasKey(`${newCard.localId}-front`);
  };

  const handleDeleteCardPair = (localId) => {
    setDeleteTargetId(localId);
  };

  const handleConfirmDeleteCard = async () => {
    const localId = deleteTargetId;
    if (!localId) return;

    const target = cards.find((item) => item.localId === localId);
    if (!target) {
      setDeleteTargetId(null);
      return;
    }

    try {
      setIsDeletingCard(true);

      if (target.id) {
        await deleteFlashcard(user.uid, packageItem.id, target.id);
      }

      delete canvasRefs.current[`${localId}-front`];
      delete canvasRefs.current[`${localId}-back`];
      delete pairCardRefs.current[localId];

      setCanvasStatusMap((prev) => {
        const next = { ...prev };
        delete next[`${localId}-front`];
        delete next[`${localId}-back`];
        return next;
      });

      setCards((prev) => prev.filter((item) => item.localId !== localId));
      setDeleteTargetId(null);
    } catch (err) {
      console.error(err);
      alert('Lỗi xóa thẻ');
    } finally {
      setIsDeletingCard(false);
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

    if (!ensurePackageName('Bạn phải nhập tên gói trước khi lưu thẻ')) {
      return;
    }

    try {
      setSavingAll(true);

      await updatePackage(user.uid, packageItem.id, packageName, packageDescription);

      lastSavedPackageRef.current = {
        name: packageName,
        description: packageDescription,
      };

      onPackageUpdatedRef.current?.({
        ...packageItemRef.current,
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
      setSaveMessage('Đã lưu toàn bộ thẻ');
    } catch (err) {
      console.error(err);
      setError('Lỗi lưu thẻ');
    } finally {
      setSavingAll(false);
    }
  };

  const renderToolbar = () => (
    <div className="inline-editor-toolbar sticky-toolbar">
      <div className="advanced-topbar-group">
        <button
          type="button"
          className="editor-btn icon-text-btn"
          onClick={() => activeCanvasRef?.undo?.()}
          disabled={!activeCanvasRef || !activeStatus.canUndo}
        >
          <span aria-hidden="true">↶</span>
          <span>Undo</span>
        </button>
        <button
          type="button"
          className="editor-btn icon-text-btn"
          onClick={() => activeCanvasRef?.redo?.()}
          disabled={!activeCanvasRef || !activeStatus.canRedo}
        >
          <span aria-hidden="true">↷</span>
          <span>Redo</span>
        </button>
      </div>

      <div
        className={`advanced-topbar-group tools-group brush-type-group ${isBrushTool ? 'open' : 'closed'
          }`}
        aria-hidden={!isBrushTool}
      >
        {BRUSH_TYPES.map((item, index) => {
          const Icon = item.icon;

          return (
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
              <Icon size={16} />
              <small>{item.label}</small>
            </button>
          );
        })}
      </div>

      <div className="advanced-topbar-group tools-group">
        {TOOL_LIST.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              className={`tool-icon-btn compact ${toolbox.tool === item.id ? 'active' : ''
                }`}
              onClick={() => setToolbox((prev) => ({ ...prev, tool: item.id }))}
            >
              <Icon size={16} />
              <small>{item.label}</small>
            </button>
          );
        })}
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
        <button
          type="button"
          className="editor-btn icon-text-btn"
          onClick={handleImportClick}
        >
          <FiUpload size={15} />
          <span>Import</span>
        </button>

        <button
          type="button"
          className="editor-btn icon-text-btn"
          onClick={() => activeCanvasRef?.exportImage?.()}
          disabled={!activeCanvasRef}
        >
          <FiDownload size={15} />
          <span>Export</span>
        </button>

        <button
          type="button"
          className="editor-btn icon-text-btn"
          onClick={() => activeCanvasRef?.clear?.()}
          disabled={!activeCanvasRef}
        >
          <FiTrash2 size={15} />
          <span>Clear</span>
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
  );

  if (loading) {
    return (
      <div className="cards-list-container">
        <div className="loading">Đang tải gói thẻ...</div>
      </div>
    );
  }

  return (
    <div className="cards-list-container cards-list-shell">
      <div className="cards-mini-header">
        <button
          className="cards-mini-back-btn"
          onClick={onBack}
          type="button"
          aria-label="Quay lại"
          title="Quay lại"
        >
          <FiArrowLeft size={18} />
        </button>

        <div className="cards-mini-title-wrap">
          {isEditingName ? (
            <input
              ref={headerNameInputRef}
              className="cards-mini-title-input"
              type="text"
              value={draftPackageName}
              onChange={(e) => setDraftPackageName(e.target.value)}
              onBlur={saveHeaderName}
              onKeyDown={handleHeaderNameKeyDown}
              placeholder="Nhập tên gói..."
              aria-label="Tên gói"
            />
          ) : (
            <button
              type="button"
              className="cards-mini-title-btn"
              onClick={openNameEditor}
              title="Sửa tên gói"
            >
              <span
                className={`cards-mini-title ${!packageName.trim() ? 'is-placeholder' : ''
                  }`}
              >
                {packageName.trim() || 'Nhấn để đặt tên gói'}
              </span>
              <FiEdit2 size={14} />
            </button>
          )}
        </div>

        <div className="cards-mini-status">
          {isAutoSaving ? (
            <span className="autosave-badge saving">Đang lưu...</span>
          ) : (
            <span className="autosave-badge saved">Đã lưu tự động</span>
          )}
        </div>
      </div>

      {renderToolbar()}

      {nameError && <div className="error-message">{nameError}</div>}
      {error && <div className="error-message">{error}</div>}
      {saveMessage && <div className="success-message-inline">{saveMessage}</div>}

      {cards.length === 0 ? (
        <div className="empty-state">
          <p>📝 Gói này chưa có thẻ nào</p>
          <p>
            {canAddCard
              ? 'Nhấn nút thêm ở góc phải bên dưới để bắt đầu'
              : 'Đặt tên gói trước rồi thêm thẻ'}
          </p>
        </div>
      ) : (
        <div className="pair-list">
          {cards.map((item, index) => {
            const frontKey = `${item.localId}-front`;
            const backKey = `${item.localId}-back`;

            return (
              <div
                key={item.localId}
                className="pair-row"
                ref={setPairCardRef(item.localId)}
              >
                <button
                  className="pair-delete-icon"
                  onClick={() => handleDeleteCardPair(item.localId)}
                  type="button"
                  aria-label={`Xóa thẻ ${index + 1}`}
                  title="Xóa thẻ"
                >
                  <FiX size={18} />
                </button>

                <div className="pair-grid">
                  <div
                    className={`face-editor-panel face-front ${activeCanvasKey === frontKey ? 'active' : ''
                      }`}
                    onMouseDown={() => setActiveCanvasKey(frontKey)}
                    onTouchStart={() => setActiveCanvasKey(frontKey)}
                  >
                    <div className="face-editor-canvas">
                      <AdvancedCanvas
                        ref={setCanvasRef(frontKey)}
                        initialImage={item.front || ''}
                        tool={toolbox.tool}
                        brushType={toolbox.brushType}
                        color={toolbox.color}
                        size={toolbox.size}
                        opacity={toolbox.opacity}
                        backgroundColor={FRONT_PAPER_COLOR}
                        onStatusChange={handleCanvasStatusChange(frontKey)}
                      />
                    </div>
                  </div>

                  <div
                    className={`face-editor-panel face-back ${activeCanvasKey === backKey ? 'active' : ''
                      }`}
                    onMouseDown={() => setActiveCanvasKey(backKey)}
                    onTouchStart={() => setActiveCanvasKey(backKey)}
                  >
                    <div className="face-editor-canvas">
                      <AdvancedCanvas
                        ref={setCanvasRef(backKey)}
                        initialImage={item.back || ''}
                        tool={toolbox.tool}
                        brushType={toolbox.brushType}
                        color={toolbox.color}
                        size={toolbox.size}
                        opacity={toolbox.opacity}
                        backgroundColor={BACK_PAPER_COLOR}
                        onStatusChange={handleCanvasStatusChange(backKey)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="floating-action-group" aria-label="Nhóm thao tác nhanh">
        <button
          className="floating-action-btn secondary"
          onClick={handleAddCardPair}
          type="button"
          aria-label="Thêm thẻ"
          title="Thêm thẻ"
        >
          <FiPlus size={22} />
        </button>
        <button
          className="floating-action-btn primary"
          onClick={handleSaveAll}
          type="button"
          aria-label={savingAll ? 'Đang lưu tất cả' : 'Lưu tất cả'}
          title={savingAll ? 'Đang lưu...' : 'Lưu tất cả'}
          disabled={savingAll}
        >
          {savingAll ? '…' : <FiSave size={20} />}
        </button>
      </div>
      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title="Xóa thẻ này?"
        message="Hành động này sẽ xóa cả mặt trước và mặt sau của thẻ."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        loading={isDeletingCard}
        onConfirm={handleConfirmDeleteCard}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}