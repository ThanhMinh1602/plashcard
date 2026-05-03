import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react'; // <-- Thêm import Framer Motion
import ConfirmModal from '../Common/ConfirmModal';
import {
  getFlashcards,
  addFlashcard,
  updateFlashcard,
  deleteFlashcard,
  updatePackage,
} from '../../services/flashcardService';

import CardsEditorHeader from './CardsEditorHeader';
import CardsEditorToolbar from './CardsEditorToolbar';
import CardsEmptyState from './CardsEmptyState';
import FlashcardPairItem from './FlashcardPairItem';
import { DEFAULT_TOOLBOX, createLocalCard, cn } from './constants';
import usePackageEditor from './hooks/usePackageEditor';
import useCanvasRegistry from './hooks/useCanvasRegistry';

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
  const [toolbox, setToolbox] = useState(DEFAULT_TOOLBOX);

  const [currentEditId, setCurrentEditId] = useState(null);
  const thumbnailListRef = useRef(null);

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
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    const preventNativeScroll = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (thumbnailListRef.current && thumbnailListRef.current.contains(target)) {
        return; 
      }
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', preventNativeScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
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
    return () => list.removeEventListener('wheel', handleWheel);
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

      const normalized = userCards.map((item) =>
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
      if (normalized.length > 0) {
        setCurrentEditId(normalized[0].localId);
        setActiveCanvasKey(`${normalized[0].localId}-front`);
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

  const handleSaveAll = async () => {
    if (!user || !packageItem?.id) return;
    setError('');
    setSaveMessage('');
    if (!ensurePackageName('Bạn phải nhập tên gói trước khi lưu thẻ')) return;

    try {
      setSavingAll(true);
      saveCurrentActiveCardData();

      await updatePackage(user.uid, packageItem.id, packageName, packageDescription);
      syncSavedPackageSnapshot({ name: packageName, description: packageDescription });
      onPackageUpdated?.({ ...packageItem, name: packageName, description: packageDescription });

      setTimeout(async () => {
        const nextCards = [];
        const frontRef = getCanvasRefByKey(`${currentEditId}-front`);
        const backRef = getCanvasRefByKey(`${currentEditId}-back`);

        for (const item of cards) {
          const isCurrent = item.localId === currentEditId;
          const frontDataStr = isCurrent ? (frontRef?.getSceneData?.() || item.frontData) : item.frontData;
          const frontImgUrl = isCurrent ? (frontRef?.toDataURL?.() || item.front) : item.front;
          const backDataStr = isCurrent ? (backRef?.getSceneData?.() || item.backData) : item.backData;
          const backImgUrl = isCurrent ? (backRef?.toDataURL?.() || item.back) : item.back;

          if (item.id) {
            await updateFlashcard(user.uid, packageItem.id, item.id, {
              front: frontImgUrl || '', back: backImgUrl || '', frontData: frontDataStr || null, backData: backDataStr || null,
            });
            nextCards.push({ ...item, front: frontImgUrl, back: backImgUrl, frontData: frontDataStr, backData: backDataStr });
          } else {
            const newId = await addFlashcard(user.uid, packageItem.id, {
              front: frontImgUrl || '', back: backImgUrl || '', frontData: frontDataStr || null, backData: backDataStr || null,
            });
            nextCards.push({ ...item, id: newId, front: frontImgUrl, back: backImgUrl, frontData: frontDataStr, backData: backDataStr });
          }
        }
        setCards(nextCards);
        setSaveMessage('Đã lưu toàn bộ thẻ');
        setSavingAll(false);
      }, 50);

    } catch (err) {
      console.error(err);
      setError('Lỗi lưu thẻ');
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="rounded-[28px] bg-white/85 px-8 py-8 text-center shadow-lg backdrop-blur-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <input id="cards-import-input" type="file" accept="image/*" className="hidden" onChange={handleImportChange} />

      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.34),transparent_26%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.28),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]">
        
        <div className="z-40 w-full shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1500px]">
            <CardsEditorHeader {...{ onBack, isEditingName, headerNameInputRef, draftPackageName, setDraftPackageName, handleHeaderNameKeyDown, saveHeaderName, cancelHeaderNameEdit, openNameEditor, packageName, isAutoSaving, handleSaveAll, savingAll, nameError, cardsCount: cards.length, activeCanvasKey, error, saveMessage }} />
            <div className="px-3 pb-3 sm:px-5 lg:px-8">
              <CardsEditorToolbar {...{ activeCanvasRef, activeStatus, toolbox, setToolbox, handleImportClick, handleAddCardPair, canAddCard }} />
            </div>
          </div>
        </div>

        {cards.length > 0 && (
          <div className="z-30 w-full shrink-0 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md">
            <div 
              ref={thumbnailListRef}
              className="flex w-full items-center gap-4 overflow-x-auto px-6 py-3 hide-scrollbar"
              style={{ touchAction: 'pan-x' }} 
            >
              {cards.map((item, index) => {
                const isActive = item.localId === currentEditId;
                return (
                  <button
                    key={item.localId}
                    type="button"
                    onClick={() => handleSwitchCard(item.localId)}
                    className={cn(
                      "group relative flex shrink-0 cursor-pointer flex-col items-center gap-2 transition-all duration-300 ease-out",
                      isActive ? "scale-110 opacity-100" : "scale-100 opacity-50 hover:scale-105 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "flex h-16 w-[100px] overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors duration-300",
                      isActive ? "border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]" : "border-slate-200"
                    )}>
                      <div className="relative h-full w-1/2 border-r border-slate-100 bg-sky-50/30">
                        {item.front && <img src={item.front} alt="F" className="absolute inset-0 h-full w-full object-cover p-1" />}
                      </div>
                      <div className="relative h-full w-1/2 bg-pink-50/30">
                        {item.back && <img src={item.back} alt="B" className="absolute inset-0 h-full w-full object-cover p-1" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              
              <button
                onClick={handleAddCardPair}
                className="flex h-16 w-[100px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-400 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-500"
              >
                +
              </button>
            </div>
          </div>
        )}

        <div 
          className={cn(
            "relative flex w-full flex-1 justify-center overflow-hidden px-4 lg:px-8",
            cards.length === 0 ? "items-center py-4" : "items-start pt-4 lg:pt-6 pb-4"
          )}
          style={{ touchAction: 'none' }}
        >
          {/* SỬ DỤNG ANIMATE PRESENCE ĐỂ QUẢN LÝ CHUYỂN CẢNH */}
          <AnimatePresence mode="wait">
            {cards.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <CardsEmptyState handleAddCardPair={handleAddCardPair} canAddCard={canAddCard} />
              </motion.div>
            ) : (
              currentCard && (
                <motion.div 
                  key={currentEditId}
                  className="w-[850px] max-w-full origin-top"
                  // Các trạng thái hoạt hình:
                  // 1. Bắt đầu (từ thumbnail bay ra): Thu nhỏ (0.1), dịch lên trên (-120px)
                  // 2. Animate (ở giữa màn hình): Kích thước chuẩn 1, vị trí chuẩn 0
                  // 3. Thoát (bay về lại thumbnail): Thu nhỏ dần về phía trên
                  initial={{ opacity: 0, scale: 0.1, y: -120 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.1, y: -120 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 350, 
                    damping: 30,
                    mass: 0.8
                  }}
                >
                  <FlashcardPairItem
                    item={currentCard}
                    index={cards.findIndex(c => c.localId === currentEditId)}
                    activeCanvasKey={activeCanvasKey}
                    setActiveCanvasKey={setActiveCanvasKey}
                    setPairCardRef={setPairCardRef}
                    setCanvasRef={setCanvasRef}
                    toolbox={toolbox}
                    handleCanvasStatusChange={handleCanvasStatusChange}
                    handleDeleteCardPair={handleDeleteCardPair}
                  />
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

      </div>

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

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </>
  );
}