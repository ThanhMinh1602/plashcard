import React, { useEffect, useState, useRef } from 'react';
import { FiMaximize2 } from 'react-icons/fi';
import { Player } from '@lottiefiles/react-lottie-player';
import savingLottie from '../../assets/lottie/sundance.json';
import monkey1 from '../../assets/lottie/monkey1.json';
import monkey2 from '../../assets/lottie/monkey2.json';
import monkey3 from '../../assets/lottie/monkey3.json';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../Common/ConfirmModal';
import {
  getFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  deletePackage,
  updatePackage,
} from '../../services/flashcardService';

import CardsEditorHeader from './CardsEditorHeader';
import CardsEditorToolbar from './CardsEditorToolbar';
import CardsEmptyState from './CardsEmptyState';
import FlashcardPairItem from './FlashcardPairItem';
import { DEFAULT_TOOLBOX, createLocalCard, cn } from './constants';
import usePackageEditor from './hooks/usePackageEditor';
import useCanvasRegistry from './hooks/useCanvasRegistry';
import usePenPress from './hooks/usePenPress';

export default function CardsList({
  user,
  packageItem,
  onBack,
  onPackageUpdated,
}) {
  const bindPress = usePenPress();
  const BACK_CONFIRM_MONKEY_LIST = [monkey1, monkey2, monkey3];

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [isBackSaving, setIsBackSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [backConfirmMonkeyIndex, setBackConfirmMonkeyIndex] = useState(0);
  const [toolbox, setToolbox] = useState(DEFAULT_TOOLBOX);

  const [currentEditId, setCurrentEditId] = useState(null);
  const thumbnailListRef = useRef(null);
  const backConfirmMonkeyIndexRef = useRef(-1);
  const savedCardsSnapshotRef = useRef([]);

  const cardGestureAreaRef = useRef(null);
  const touchPointersRef = useRef(new Map());

  const [cardTransform, setCardTransform] = useState({
    zoom: 1,
    x: 0,
    y: 0,
  });

  const cardTransformRef = useRef({
    zoom: 1,
    x: 0,
    y: 0,
  });

  const pinchGestureRef = useRef({
    active: false,
    startDistance: 0,
    startZoom: 1,
    contentPoint: {
      x: 0,
      y: 0,
    },
  });

  const {
    packageName,
    packageDescription,
    isEditingName,
    draftPackageName,
    isAutoSaving,
    nameError,
    headerNameInputRef,
    setDraftPackageName,
    openNameEditor,
    saveHeaderName,
    cancelHeaderNameEdit,
    handleHeaderNameKeyDown,
    handleDescriptionChange,
    ensurePackageName,
    syncSavedPackageSnapshot,
  } = usePackageEditor({
    user,
    packageItem,
    onPackageUpdated,
    setError,
  });

  const {
    activeCanvasKey,
    setActiveCanvasKey,
    activeCanvasRef,
    activeStatus,
    setCanvasRef,
    getCanvasRefByKey,
    setPairCardRef,
    handleCanvasStatusChange,
    removeCardBindings,
  } = useCanvasRegistry({
    cards,
    packageId: packageItem?.id,
  });

  const canAddCard = packageName.trim().length > 0;
  const currentCard = cards.find((c) => c.localId === currentEditId);

  const normalizeSnapshotValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const createComparableCard = (card, override = {}) => {
    return {
      id: card.id || null,
      front: normalizeSnapshotValue(override.front ?? card.front),
      back: normalizeSnapshotValue(override.back ?? card.back),
      frontData: normalizeSnapshotValue(
        override.frontData ?? card.frontData
      ),
      backData: normalizeSnapshotValue(
        override.backData ?? card.backData
      ),
    };
  };

  const shouldKeepCardInSnapshot = (card) => {
    return Boolean(
      card.id ||
      card.front ||
      card.back ||
      card.frontData ||
      card.backData
    );
  };

  const buildSavedCardsSnapshot = (sourceCards) => {
    return (sourceCards || [])
      .map((card) => createComparableCard(card))
      .filter(shouldKeepCardInSnapshot);
  };

  const getCurrentCardsSnapshot = () => {
    const frontRef = currentEditId
      ? getCanvasRefByKey(`${currentEditId}-front`)
      : null;

    const backRef = currentEditId
      ? getCanvasRefByKey(`${currentEditId}-back`)
      : null;

    return (cards || [])
      .map((card) => {
        const isCurrent = card.localId === currentEditId;

        if (!isCurrent) {
          return createComparableCard(card);
        }

        const frontDataFromCanvas = frontRef?.getSceneData?.();
        const backDataFromCanvas = backRef?.getSceneData?.();

        return createComparableCard(card, {
          frontData: frontDataFromCanvas || card.frontData,
          backData: backDataFromCanvas || card.backData,
        });
      })
      .filter(shouldKeepCardInSnapshot);
  };

  const markCardsSnapshotSaved = (sourceCards) => {
    savedCardsSnapshotRef.current = buildSavedCardsSnapshot(sourceCards);
  };

  const removeCardFromSavedSnapshot = (cardId) => {
    if (!cardId) return;

    savedCardsSnapshotRef.current = savedCardsSnapshotRef.current.filter(
      (card) => card.id !== cardId
    );
  };

  const hasUnsavedCardChanges = (currentSnapshot = getCurrentCardsSnapshot()) => {
    return (
      JSON.stringify(currentSnapshot) !==
      JSON.stringify(savedCardsSnapshotRef.current)
    );
  };

  const saveCurrentActiveCardData = () => {
    if (!currentEditId) return;

    const frontRef = getCanvasRefByKey(`${currentEditId}-front`);
    const backRef = getCanvasRefByKey(`${currentEditId}-back`);

    if (!frontRef && !backRef) return;

    const frontImg = frontRef?.toDataURL?.();
    const backImg = backRef?.toDataURL?.();
    const frontDataStr = frontRef?.getSceneData?.();
    const backDataStr = backRef?.getSceneData?.();

    setCards((prev) =>
      prev.map((card) => {
        if (card.localId === currentEditId) {
          return {
            ...card,
            frontData: frontDataStr || card.frontData,
            front: frontImg || card.front,
            backData: backDataStr || card.backData,
            back: backImg || card.back,
          };
        }

        return card;
      })
    );
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const preventNativeScroll = (e) => {
      const target = e.target;

      if (
        target.closest?.(
          'button,input,textarea,select,label,[data-allow-touch]'
        )
      ) {
        return;
      }

      if (
        thumbnailListRef.current &&
        thumbnailListRef.current.contains(target)
      ) {
        return;
      }

      e.preventDefault();
    };

    document.addEventListener('touchmove', preventNativeScroll, {
      passive: false,
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('touchmove', preventNativeScroll);
    };
  }, []);

  useEffect(() => {
    const list = thumbnailListRef.current;
    if (!list) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        list.scrollLeft += e.deltaY;
      }
    };

    list.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      list.removeEventListener('wheel', handleWheel);
    };
  }, [cards.length]);

  useEffect(() => {
    loadCards();
  }, [user, packageItem?.id]);

  const loadCards = async () => {
    if (!user || !packageItem?.id) return;

    try {
      setLoading(true);
      setError('');

      const userCards = await getFlashcards(user.uid, packageItem.id);

      const sortedCards = [...userCards].sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() ||
          a.createdAt?.seconds ||
          a.createdAt ||
          0;

        const bTime =
          b.createdAt?.toMillis?.() ||
          b.createdAt?.seconds ||
          b.createdAt ||
          0;

        return aTime - bTime;
      });

      const normalized = sortedCards.map((item) =>
        createLocalCard({
          localId: item.id,
          id: item.id,
          front: item.front,
          back: item.back,
          frontData: item.frontData || null,
          backData: item.backData || null,
        })
      );

      setCards(normalized);
      markCardsSnapshotSaved(normalized);

      if (normalized.length > 0) {
        setCurrentEditId(normalized[0].localId);
        setActiveCanvasKey(`${normalized[0].localId}-front`);
      } else {
        setCurrentEditId(null);
        setActiveCanvasKey(null);
      }
    } catch (err) {
      console.error('Lỗi load cards:', err);
      setError('Lỗi tải danh sách thẻ');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchCard = (targetId) => {
    if (currentEditId === targetId) return;

    saveCurrentActiveCardData();

    resetCardTransform();

    setCurrentEditId(targetId);
    setActiveCanvasKey(`${targetId}-front`);
  };

  const handleAddCardPair = () => {
    setError('');
    setSaveMessage('');

    if (!ensurePackageName('Bạn phải nhập tên gói trước khi thêm thẻ')) {
      return;
    }

    saveCurrentActiveCardData();

    resetCardTransform();

    const newCard = createLocalCard();

    setCards((prev) => [...prev, newCard]);
    setCurrentEditId(newCard.localId);
    setActiveCanvasKey(`${newCard.localId}-front`);

    setTimeout(() => {
      if (thumbnailListRef.current) {
        thumbnailListRef.current.scrollTo({
          left: thumbnailListRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const handleDeleteCardPair = (localId) => {
    setDeleteTargetId(localId);
  };

  const handleConfirmDeleteCard = async () => {
    const localId = deleteTargetId;
    if (!localId) return;

    const targetIndex = cards.findIndex((item) => item.localId === localId);
    const target = cards[targetIndex];

    if (!target) {
      setDeleteTargetId(null);
      return;
    }

    try {
      setIsDeletingCard(true);

      if (target.id) {
        await deleteFlashcard(user.uid, packageItem.id, target.id);
        removeCardFromSavedSnapshot(target.id);
      }

      removeCardBindings(localId);

      const nextCards = cards.filter((item) => item.localId !== localId);

      setCards(nextCards);

      if (currentEditId === localId) {
        if (nextCards.length > 0) {
          const nextIndex = Math.min(targetIndex, nextCards.length - 1);
          setCurrentEditId(nextCards[nextIndex].localId);
          setActiveCanvasKey(`${nextCards[nextIndex].localId}-front`);
        } else {
          setCurrentEditId(null);
          setActiveCanvasKey(null);
        }
      }

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

    document.getElementById('cards-import-input')?.click();
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

  const saveAllCards = async ({ showMessage = true } = {}) => {
    if (!user || !packageItem?.id) {
      return false;
    }

    if (savingAll) {
      return false;
    }

    setError('');
    setSaveMessage('');

    if (!ensurePackageName('Bạn phải nhập tên gói trước khi lưu thẻ')) {
      return false;
    }

    try {
      setSavingAll(true);

      const frontRef = currentEditId
        ? getCanvasRefByKey(`${currentEditId}-front`)
        : null;

      const backRef = currentEditId
        ? getCanvasRefByKey(`${currentEditId}-back`)
        : null;

      await updatePackage(
        user.uid,
        packageItem.id,
        packageName,
        packageDescription
      );

      syncSavedPackageSnapshot({
        name: packageName,
        description: packageDescription,
      });

      onPackageUpdated?.({
        ...packageItem,
        name: packageName,
        description: packageDescription,
      });

      const nextCards = [];

      for (const item of cards) {
        const isCurrent = item.localId === currentEditId;

        const frontDataStr = isCurrent
          ? frontRef?.getSceneData?.() || item.frontData
          : item.frontData;

        const frontImgUrl = isCurrent
          ? frontRef?.toDataURL?.() || item.front
          : item.front;

        const backDataStr = isCurrent
          ? backRef?.getSceneData?.() || item.backData
          : item.backData;

        const backImgUrl = isCurrent
          ? backRef?.toDataURL?.() || item.back
          : item.back;

        if (item.id) {
          await updateFlashcard(user.uid, packageItem.id, item.id, {
            front: frontImgUrl || '',
            back: backImgUrl || '',
            frontData: frontDataStr || null,
            backData: backDataStr || null,
          });

          nextCards.push({
            ...item,
            front: frontImgUrl,
            back: backImgUrl,
            frontData: frontDataStr,
            backData: backDataStr,
          });
        } else {
          const newId = await addFlashcard(user.uid, packageItem.id, {
            front: frontImgUrl || '',
            back: backImgUrl || '',
            frontData: frontDataStr || null,
            backData: backDataStr || null,
          });

          nextCards.push({
            ...item,
            id: newId,
            front: frontImgUrl,
            back: backImgUrl,
            frontData: frontDataStr,
            backData: backDataStr,
          });
        }
      }

      setCards(nextCards);
      markCardsSnapshotSaved(nextCards);

      if (showMessage) {
        setSaveMessage('Đã lưu toàn bộ thẻ');
      }

      return true;
    } catch (err) {
      console.error(err);
      setError('Lỗi lưu thẻ');
      return false;
    } finally {
      setSavingAll(false);
    }
  };

  const waitForNextPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

  const handleSaveAll = async () => {
    if (savingAll || isBackSaving) return;

    setIsBackSaving(true);

    await waitForNextPaint();

    await saveAllCards({ showMessage: true });

    setIsBackSaving(false);
  };

  const handleBackClick = async () => {
    if (savingAll || isBackSaving) return;

    const currentSnapshot = getCurrentCardsSnapshot();
    const savedSnapshot = savedCardsSnapshotRef.current;

    if (currentSnapshot.length === 0 && savedSnapshot.length === 0) {
      try {
        if (user?.uid && packageItem?.id) {
          await deletePackage(user.uid, packageItem.id);
        }

        onBack?.();
      } catch (err) {
        console.error(err);
        setError('Lỗi thoát gói rỗng');
      }

      return;
    }

    if (!hasUnsavedCardChanges(currentSnapshot)) {
      onBack?.();
      return;
    }

    const nextMonkeyIndex =
      (backConfirmMonkeyIndexRef.current + 1) %
      BACK_CONFIRM_MONKEY_LIST.length;

    backConfirmMonkeyIndexRef.current = nextMonkeyIndex;
    setBackConfirmMonkeyIndex(nextMonkeyIndex);
    setShowBackConfirm(true);
  };

  const handleConfirmBackWithoutSave = () => {
    setShowBackConfirm(false);
    onBack?.();
  };

  const MIN_CARD_ZOOM = 0.65;
  const MAX_CARD_ZOOM = 2.5;

  const clampCardZoom = (value) => {
    return Math.max(MIN_CARD_ZOOM, Math.min(MAX_CARD_ZOOM, value));
  };

  const updateCardTransform = (nextTransform) => {
    const safeTransform = {
      zoom: clampCardZoom(nextTransform.zoom),
      x: nextTransform.x,
      y: nextTransform.y,
    };

    cardTransformRef.current = safeTransform;
    setCardTransform(safeTransform);
  };

  const getTouchPoints = () => {
    return Array.from(touchPointersRef.current.values());
  };

  const getPinchMetrics = () => {
    const points = getTouchPoints();

    if (points.length < 2) {
      return null;
    }

    const [a, b] = points;

    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      midpoint: {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      },
    };
  };

  const startPinchGesture = () => {
    const area = cardGestureAreaRef.current;
    const metrics = getPinchMetrics();

    if (!area || !metrics) return;

    const rect = area.getBoundingClientRect();
    const currentTransform = cardTransformRef.current;

    const localMidpoint = {
      x: metrics.midpoint.x - rect.left,
      y: metrics.midpoint.y - rect.top,
    };

    pinchGestureRef.current = {
      active: true,
      startDistance: metrics.distance || 1,
      startZoom: currentTransform.zoom,
      contentPoint: {
        x: (localMidpoint.x - currentTransform.x) / currentTransform.zoom,
        y: (localMidpoint.y - currentTransform.y) / currentTransform.zoom,
      },
    };
  };

  const handleCardPointerDownCapture = (e) => {
    if (e.pointerType !== 'touch') return;

    touchPointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });

    e.currentTarget.setPointerCapture?.(e.pointerId);

    if (touchPointersRef.current.size >= 2) {
      e.preventDefault();
      e.stopPropagation();
      startPinchGesture();
    }
  };

  const handleCardPointerMoveCapture = (e) => {
    if (e.pointerType !== 'touch') return;

    if (!touchPointersRef.current.has(e.pointerId)) return;

    touchPointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });

    if (touchPointersRef.current.size < 2) return;

    e.preventDefault();
    e.stopPropagation();

    const area = cardGestureAreaRef.current;
    const metrics = getPinchMetrics();

    if (!area || !metrics) return;

    if (!pinchGestureRef.current.active) {
      startPinchGesture();
      return;
    }

    const rect = area.getBoundingClientRect();
    const gesture = pinchGestureRef.current;

    const nextZoom = clampCardZoom(
      gesture.startZoom * (metrics.distance / gesture.startDistance)
    );

    const localMidpoint = {
      x: metrics.midpoint.x - rect.left,
      y: metrics.midpoint.y - rect.top,
    };

    const nextX = localMidpoint.x - gesture.contentPoint.x * nextZoom;
    const nextY = localMidpoint.y - gesture.contentPoint.y * nextZoom;

    updateCardTransform({
      zoom: nextZoom,
      x: nextX,
      y: nextY,
    });
  };

  const handleCardPointerEndCapture = (e) => {
    if (e.pointerType !== 'touch') return;

    touchPointersRef.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (touchPointersRef.current.size >= 2) {
      startPinchGesture();
      return;
    }

    pinchGestureRef.current = {
      active: false,
      startDistance: 0,
      startZoom: cardTransformRef.current.zoom,
      contentPoint: {
        x: 0,
        y: 0,
      },
    };
  };

  const resetCardTransform = () => {
    updateCardTransform({
      zoom: 1,
      x: 0,
      y: 0,
    });
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="rounded-[28px] bg-white/85 px-8 py-8 text-center shadow-lg backdrop-blur-xl">
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        id="cards-import-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImportChange}
      />

      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.34),transparent_26%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.28),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]">
        <div
          className="z-40 w-full shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="mx-auto w-full max-w-[1500px]">
            <CardsEditorHeader
              onBack={handleBackClick}
              isEditingName={isEditingName}
              headerNameInputRef={headerNameInputRef}
              draftPackageName={draftPackageName}
              setDraftPackageName={setDraftPackageName}
              handleHeaderNameKeyDown={handleHeaderNameKeyDown}
              saveHeaderName={saveHeaderName}
              cancelHeaderNameEdit={cancelHeaderNameEdit}
              openNameEditor={openNameEditor}
              packageName={packageName}
              isAutoSaving={isAutoSaving}
              handleSaveAll={handleSaveAll}
              savingAll={savingAll || isBackSaving}
              nameError={nameError}
              cardsCount={cards.length}
              activeCanvasKey={activeCanvasKey}
              error={error}
              saveMessage={saveMessage}
            />

            <div className="px-3 pb-3 sm:px-5 lg:px-8">
              <CardsEditorToolbar
                activeCanvasRef={activeCanvasRef}
                activeStatus={activeStatus}
                toolbox={toolbox}
                setToolbox={setToolbox}
                handleImportClick={handleImportClick}
                handleAddCardPair={handleAddCardPair}
                canAddCard={canAddCard}
              />
            </div>
          </div>
        </div>

        {cards.length > 0 && (
          <div className="z-30 w-full shrink-0 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md">
            <div
              ref={thumbnailListRef}
              className="hide-scrollbar flex w-full items-center gap-4 overflow-x-auto px-6 py-3"
              style={{ touchAction: 'pan-x' }}
              data-allow-touch
            >
              {cards.map((item) => {
                const isActive = item.localId === currentEditId;

                return (
                  <button
                    key={item.localId}
                    type="button"
                    {...bindPress(() => handleSwitchCard(item.localId))}
                    className={cn(
                      'group relative flex shrink-0 cursor-pointer flex-col items-center gap-2 transition-all duration-300 ease-out',
                      isActive
                        ? 'scale-110 opacity-100'
                        : 'scale-100 opacity-50 hover:scale-105 hover:opacity-100'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-16 w-[100px] overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors duration-300',
                        isActive
                          ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                          : 'border-slate-200'
                      )}
                    >
                      <div className="relative h-full w-1/2 border-r border-slate-100 bg-sky-50/30">
                        {item.front && (
                          <img
                            src={item.front}
                            alt="F"
                            className="absolute inset-0 h-full w-full object-cover p-1"
                          />
                        )}
                      </div>

                      <div className="relative h-full w-1/2 bg-pink-50/30">
                        {item.back && (
                          <img
                            src={item.back}
                            alt="B"
                            className="absolute inset-0 h-full w-full object-cover p-1"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                disabled={!canAddCard}
                {...bindPress(handleAddCardPair, !canAddCard)}
                className={cn(
                  'flex h-16 w-[100px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed bg-white/50 transition',
                  canAddCard
                    ? 'border-slate-300 text-slate-400 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-500'
                    : 'cursor-not-allowed border-slate-200 text-slate-300'
                )}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            'relative flex w-full flex-1 justify-center overflow-hidden px-4 lg:px-8',
            cards.length === 0
              ? 'items-center py-4'
              : 'items-start pt-4 pb-4 lg:pt-6'
          )}
          style={{ touchAction: 'none' }}
        >
          <AnimatePresence mode="wait">
            {cards.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <CardsEmptyState
                  handleAddCardPair={handleAddCardPair}
                  canAddCard={canAddCard}
                />
              </motion.div>
            ) : (
              currentCard && (
                <motion.div
                  key={currentEditId}
                  className="w-[850px] max-w-full origin-top"
                  initial={{ opacity: 0, scale: 0.1, y: -120 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.1, y: -120 }}
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                    mass: 0.8,
                  }}
                >
                  <div
                    ref={cardGestureAreaRef}
                    className="relative"
                    style={{ touchAction: 'none' }}
                    onPointerDownCapture={handleCardPointerDownCapture}
                    onPointerMoveCapture={handleCardPointerMoveCapture}
                    onPointerUpCapture={handleCardPointerEndCapture}
                    onPointerCancelCapture={handleCardPointerEndCapture}
                  >
                    <div
                      className="origin-top-left will-change-transform"
                      style={{
                        transform: `translate3d(${cardTransform.x}px, ${cardTransform.y}px, 0) scale(${cardTransform.zoom})`,
                        transformOrigin: '0 0',
                      }}
                    >
                      <FlashcardPairItem
                        item={currentCard}
                        index={cards.findIndex(
                          (c) => c.localId === currentEditId
                        )}
                        activeCanvasKey={activeCanvasKey}
                        setActiveCanvasKey={setActiveCanvasKey}
                        setPairCardRef={setPairCardRef}
                        setCanvasRef={setCanvasRef}
                        toolbox={toolbox}
                        handleCanvasStatusChange={handleCanvasStatusChange}
                        handleDeleteCardPair={handleDeleteCardPair}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>

          {cards.length > 0 && (
            <button
              type="button"
              {...bindPress(resetCardTransform)}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onPointerMoveCapture={(e) => e.stopPropagation()}
              onPointerUpCapture={(e) => e.stopPropagation()}
              data-allow-touch
              className="absolute right-4 top-4 z-50 inline-flex h-8 items-center gap-1.5 rounded-full border border-white/70 bg-white/65 px-2.5 text-[10px] font-black text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition hover:bg-white hover:text-slate-900"
              title="Trở về kích thước ban đầu"
            >
              <FiMaximize2 size={13} />
              <span>{Math.round(cardTransform.zoom * 100)}%</span>
            </button>
          )}
        </div>
      </div>

      {isBackSaving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-sm flex-col items-center rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="mb-4 h-32 w-32">
              <Player
                autoplay
                loop
                src={savingLottie}
                className="h-full w-full"
              />
            </div>

            <h3 className="text-lg font-black text-slate-800">
              Đang lưu thẻ...
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vui lòng không thoát ứng dụng trong lúc hệ thống đang lưu dữ liệu.
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showBackConfirm}
        title="Thoát mà không lưu?"
        message="Mất hết ráng chịu nha! :))"
        confirmText="Thoát không lưu"
        cancelText="Ở lại"
        variant="warning"
        loading={false}
        lottieSrc={BACK_CONFIRM_MONKEY_LIST[backConfirmMonkeyIndex]}
        lottieClassName="h-28 w-28"
        onConfirm={handleConfirmBackWithoutSave}
        onClose={() => setShowBackConfirm(false)}
      />

      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title="Xóa cặp thẻ này?"
        message="Cả mặt trước và mặt sau của thẻ sẽ bị xóa."
        confirmText="Xóa thẻ"
        cancelText="Hủy"
        variant="danger"
        loading={isDeletingCard}
        onConfirm={handleConfirmDeleteCard}
        onClose={() => setDeleteTargetId(null)}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </>
  );
}