import React, { useEffect, useState } from 'react';
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
import {
  DEFAULT_TOOLBOX,
  createLocalCard,
} from './constants';
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
    queueScrollToCard,
    removeCardBindings,
  } = useCanvasRegistry({
    cards,
    packageId: packageItem?.id,
  });

  const canAddCard = packageName.trim().length > 0;

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
    } catch (err) {
      console.error('Lỗi load cards:', err);
      setError('Lỗi tải danh sách thẻ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCardPair = () => {
    setError('');
    setSaveMessage('');

    if (!ensurePackageName('Bạn phải nhập tên gói trước khi thêm thẻ')) {
      return;
    }

    const newCard = createLocalCard();
    queueScrollToCard(newCard.localId);
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

      removeCardBindings(localId);
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

    const input = document.getElementById('cards-import-input');
    input?.click();
  };

  // ĐÃ BỔ SUNG LẠI HÀM NÀY ĐỂ FIX LỖI "handleImportChange is not defined"
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
        const frontRef = getCanvasRefByKey(`${item.localId}-front`);
        const backRef = getCanvasRefByKey(`${item.localId}-back`);

        const front = frontRef?.toDataURL?.() || item.front || '';
        const back = backRef?.toDataURL?.() || item.back || '';

        const frontData = frontRef?.getSceneData?.() || item.frontData || null;
        const backData = backRef?.getSceneData?.() || item.backData || null;

        if (item.id) {
          await updateFlashcard(user.uid, packageItem.id, item.id, {
            front,
            back,
            frontData,
            backData,
          });

          nextCards.push({
            ...item,
            front,
            back,
            frontData,
            backData,
          });
        } else {
          const newId = await addFlashcard(user.uid, packageItem.id, {
            front,
            back,
            frontData,
            backData,
          });

          nextCards.push({
            ...item,
            id: newId,
            front,
            back,
            frontData,
            backData,
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

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/70 bg-white/85 px-8 py-8 text-center text-slate-500 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-xl">
          Đang tải danh sách thẻ...
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

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.34),transparent_26%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.28),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)] pb-12">
        
        {/* VÙNG KHÓA CỨNG Ở TOP: Gộp chung Header & Toolbar */}
        <div className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1500px]">
            <CardsEditorHeader
              onBack={onBack}
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
              savingAll={savingAll}
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

        {/* VÙNG DANH SÁCH THẺ TRƯỢT TỰ DO */}
        <div className="mx-auto w-full max-w-[1500px] px-3 pt-6 sm:px-5 lg:px-8">
          {cards.length === 0 ? (
            <CardsEmptyState
              handleAddCardPair={handleAddCardPair}
              canAddCard={canAddCard}
            />
          ) : (
            <div className="space-y-6">
              {cards.map((item, index) => (
                <FlashcardPairItem
                  key={item.localId}
                  item={item}
                  index={index}
                  activeCanvasKey={activeCanvasKey}
                  setActiveCanvasKey={setActiveCanvasKey}
                  setPairCardRef={setPairCardRef}
                  setCanvasRef={setCanvasRef}
                  toolbox={toolbox}
                  handleCanvasStatusChange={handleCanvasStatusChange}
                  handleDeleteCardPair={handleDeleteCardPair}
                />
              ))}
            </div>
          )}
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
    </>
  );
}