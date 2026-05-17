import React, { useEffect, useState, useRef } from "react";
import { FiCheck, FiLoader, FiMaximize2, FiX } from "react-icons/fi";
import { Player } from "@lottiefiles/react-lottie-player";
import savingLottie from "../../assets/lottie/sundance.json";
import monkey1 from "../../assets/lottie/monkey1.json";
import monkey2 from "../../assets/lottie/monkey2.json";
import monkey3 from "../../assets/lottie/monkey3.json";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "../Common/ConfirmModal";
import {
  getFlashcards,
  deleteFlashcard,
  updatePackage,
  updatePackageBackground,
  bulkSaveCards,
} from "../../services/flashcardService";

import CardsEditorHeader from "./CardsEditorHeader";
import CardsEditorToolbar from "./CardsEditorToolbar";
import CardsEmptyState from "./CardsEmptyState";
import FlashcardPairItem from "./FlashcardPairItem";
import { DEFAULT_TOOLBOX, createLocalCard, cn } from "./constants";
import {
  DEFAULT_CARD_BACKGROUND_PAIR_ID,
  getCardBackgroundPair,
} from "../../utils/cardBackgrounds";
import usePackageEditor from "./hooks/usePackageEditor";
import useCanvasRegistry from "./hooks/useCanvasRegistry";
import usePenPress from "./hooks/usePenPress";

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
  const [openProgress, setOpenProgress] = useState(0);
  const [openProgressMessage, setOpenProgressMessage] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [isBackSaving, setIsBackSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [cardSaveStatusMap, setCardSaveStatusMap] = useState({});
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [backConfirmMonkeyIndex, setBackConfirmMonkeyIndex] = useState(0);
  const [toolbox, setToolbox] = useState(DEFAULT_TOOLBOX);
  const [packageBackgroundPairId, setPackageBackgroundPairId] = useState(
    packageItem?.backgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID,
  );

  const [currentEditId, setCurrentEditId] = useState(null);
  const thumbnailListRef = useRef(null);
  const backConfirmMonkeyIndexRef = useRef(-1);
  const savedCardsSnapshotRef = useRef([]);
  const openProgressTimerRef = useRef(null);

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
    nameError,
    headerNameInputRef,
    setDraftPackageName,
    openNameEditor,
    saveHeaderName,
    cancelHeaderNameEdit,
    handleHeaderNameKeyDown,
    handleDescriptionChange,
    ensurePackageName,
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

  useEffect(() => {
    setPackageBackgroundPairId(
      packageItem?.backgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID,
    );
  }, [packageItem?.id, packageItem?.backgroundPairId]);

  const normalizeSnapshotValue = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;

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
      frontData: normalizeSnapshotValue(override.frontData ?? card.frontData),
      backData: normalizeSnapshotValue(override.backData ?? card.backData),
      backgroundPairId: normalizeSnapshotValue(
        override.backgroundPairId ?? card.backgroundPairId,
      ),
    };
  };

  const shouldKeepCardInSnapshot = (card) => {
    return Boolean(
      card.id ||
      card.front ||
      card.back ||
      card.frontData ||
      card.backData ||
      card.backgroundPairId !== DEFAULT_CARD_BACKGROUND_PAIR_ID,
    );
  };

  const buildSavedCardsSnapshot = (sourceCards) => {
    return (sourceCards || [])
      .map((card) => createComparableCard(card))
      .filter(shouldKeepCardInSnapshot);
  };

  const getCurrentCardsSnapshot = () => {
    return (cards || [])
      .map((card) => {
        const isCurrent = card.localId === currentEditId;

        if (!isCurrent) {
          return createComparableCard(card);
        }

        const frontRef = getCanvasRefByKey(`${currentEditId}-front`);
        const backRef = getCanvasRefByKey(`${currentEditId}-back`);
        const frontImg = frontRef?.toDataURL?.({ excludeImages: true });
        const backImg = backRef?.toDataURL?.({ excludeImages: true });
        const frontData =
          frontRef?.getFullSceneData?.() || frontRef?.getSceneData?.();
        const backData =
          backRef?.getFullSceneData?.() || backRef?.getSceneData?.();

        return createComparableCard(card, {
          front: frontImg || card.front,
          back: backImg || card.back,
          frontData: frontData || card.frontData,
          backData: backData || card.backData,
        });
      })
      .filter(shouldKeepCardInSnapshot);
  };

  const markCardsSnapshotSaved = (sourceCards) => {
    savedCardsSnapshotRef.current = buildSavedCardsSnapshot(sourceCards);
  };

  const markCardSnapshotsSaved = (savedCards) => {
    const savedKeys = new Set(savedCards.map((card) => card.id || card.localId));
    const nextSnapshots = savedCards.map((card) => createComparableCard(card));

    savedCardsSnapshotRef.current = [
      ...savedCardsSnapshotRef.current.filter(
        (snapshot) => !savedKeys.has(snapshot.id),
      ),
      ...nextSnapshots,
    ];
  };

  const setCardSaveStatus = (localId, status) => {
    if (!localId) return;

    setCardSaveStatusMap((prev) => ({
      ...prev,
      [localId]: status,
    }));
  };

  const removeCardFromSavedSnapshot = (cardId) => {
    if (!cardId) return;

    savedCardsSnapshotRef.current = savedCardsSnapshotRef.current.filter(
      (card) => card.id !== cardId,
    );
  };

  const hasUnsavedCardChanges = (
    currentSnapshot = getCurrentCardsSnapshot(),
  ) => {
    return (
      JSON.stringify(currentSnapshot) !==
      JSON.stringify(savedCardsSnapshotRef.current)
    );
  };
  const getCardsWithCurrentCanvasData = () => {
    return (cards || []).map((item) => {
      const isCurrent = item.localId === currentEditId;

      if (!isCurrent) {
        return {
          ...item,
          backgroundPairId:
            packageBackgroundPairId ||
            item.backgroundPairId ||
            DEFAULT_CARD_BACKGROUND_PAIR_ID,
        };
      }

      const frontRef = getCanvasRefByKey(`${item.localId}-front`);
      const backRef = getCanvasRefByKey(`${item.localId}-back`);

      const frontImg =
        frontRef?.toDataURL?.({ excludeImages: true }) || item.front || "";
      const frontData =
        frontRef?.getFullSceneData?.() ||
        frontRef?.getSceneData?.() ||
        item.frontData ||
        null;

      const backImg =
        backRef?.toDataURL?.({ excludeImages: true }) || item.back || "";
      const backData =
        backRef?.getFullSceneData?.() ||
        backRef?.getSceneData?.() ||
        item.backData ||
        null;

      return {
        ...item,
        front: frontImg,
        back: backImg,
        frontData,
        backData,
        backgroundPairId:
          packageBackgroundPairId ||
          item.backgroundPairId ||
          DEFAULT_CARD_BACKGROUND_PAIR_ID,
      };
    });
  };

  const getChangedCards = (nextCards) => {
    const savedMap = new Map(
      savedCardsSnapshotRef.current.map((item) => [item.id, item]),
    );

    return nextCards.filter((card) => {
      const comparableCard = createComparableCard(card);
      const savedCard = savedMap.get(comparableCard.id);

      if (!savedCard) return true;

      return JSON.stringify(comparableCard) !== JSON.stringify(savedCard);
    });
  };

  const toBulkCardPayload = (card) => {
    const backgroundPairId =
      card.backgroundPairId ||
      packageBackgroundPairId ||
      DEFAULT_CARD_BACKGROUND_PAIR_ID;

    return {
      localId: card.localId,
      front: {
        pairId: card.localId,
        side: "front",
        content: card.front || "",
        canvasData: card.frontData || null,
        backgroundPairId,
      },
      back: {
        pairId: card.localId,
        side: "back",
        content: card.back || "",
        canvasData: card.backData || null,
        backgroundPairId,
      },
    };
  };

  const saveCardsInBackground = async (sourceCards, localIds) => {
    if (!user?.uid || !packageItem?.id || !localIds?.length) return;

    const localIdSet = new Set(localIds);
    const changedCards = getChangedCards(sourceCards).filter((card) =>
      localIdSet.has(card.localId),
    );

    if (changedCards.length === 0) {
      localIds.forEach((localId) => setCardSaveStatus(localId, "success"));
      return;
    }

    changedCards.forEach((card) => setCardSaveStatus(card.localId, "saving"));

    try {
      const savedResult = await bulkSaveCards(
        user.uid,
        packageItem.id,
        changedCards.map(toBulkCardPayload),
      );
      const savedCardMap = new Map(
        (savedResult?.cards || []).map((card) => [card.localId || card.id, card]),
      );
      const savedCards = changedCards.map((card) => {
        const savedCard = savedCardMap.get(card.localId);
        return {
          ...card,
          id: savedCard?.localId || savedCard?.id || card.localId,
        };
      });

      setCards((prev) =>
        prev.map((card) => {
          const savedCard = savedCards.find(
            (item) => item.localId === card.localId,
          );
          return savedCard ? { ...card, id: savedCard.id } : card;
        }),
      );
      markCardSnapshotsSaved(savedCards);
      changedCards.forEach((card) => setCardSaveStatus(card.localId, "success"));
    } catch (err) {
      console.error(err);
      changedCards.forEach((card) => setCardSaveStatus(card.localId, "error"));
    }
  };

  const saveCurrentActiveCardData = () => {
    if (!currentEditId) return;

    const frontRef = getCanvasRefByKey(`${currentEditId}-front`);
    const backRef = getCanvasRefByKey(`${currentEditId}-back`);

    if (!frontRef && !backRef) return;

    const frontImg = frontRef?.toDataURL?.({ excludeImages: true });
    const backImg = backRef?.toDataURL?.({ excludeImages: true });
    const frontData =
      frontRef?.getFullSceneData?.() || frontRef?.getSceneData?.();
    const backData =
      backRef?.getFullSceneData?.() || backRef?.getSceneData?.();

    setCards((prev) =>
      prev.map((card) => {
        if (card.localId === currentEditId) {
          return {
            ...card,
            front: frontImg || card.front,
            back: backImg || card.back,
            frontData: frontData || card.frontData,
            backData: backData || card.backData,
          };
        }

        return card;
      }),
    );
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const preventNativeScroll = (e) => {
      const target = e.target;

      if (
        target.closest?.(
          "button,input,textarea,select,label,[data-allow-touch]",
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

    document.addEventListener("touchmove", preventNativeScroll, {
      passive: false,
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("touchmove", preventNativeScroll);
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

    list.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      list.removeEventListener("wheel", handleWheel);
    };
  }, [cards.length]);

  useEffect(() => {
    loadCards();
  }, [user, packageItem?.id]);

  useEffect(() => {
    return () => {
      if (openProgressTimerRef.current) {
        clearInterval(openProgressTimerRef.current);
      }
    };
  }, []);

  const loadCards = async () => {
    if (!user || !packageItem?.id) return;

    try {
      setLoading(true);
      setOpenProgress(8);
      setOpenProgressMessage("Đang kết nối dữ liệu bộ thẻ...");

      if (openProgressTimerRef.current) {
        clearInterval(openProgressTimerRef.current);
      }

      openProgressTimerRef.current = setInterval(() => {
        setOpenProgress((prev) => {
          if (prev >= 92) return prev;

          const next = Math.min(
            prev + Math.max(2, Math.round((92 - prev) / 8)),
            92,
          );

          if (next >= 72) {
            setOpenProgressMessage("Đang dựng không gian chỉnh sửa...");
          } else if (next >= 38) {
            setOpenProgressMessage("Đang chuẩn bị dữ liệu và nền thẻ...");
          } else {
            setOpenProgressMessage("Đang tải nội dung bộ thẻ...");
          }

          return next;
        });
      }, 260);

      const rawDocs = await getFlashcards(user.uid, packageItem.id);
      setOpenProgress(100);
      setOpenProgressMessage("Hoàn tất, đang mở bộ thẻ...");

      // Logic gộp PairId
      const pairsMap = {};

      rawDocs.forEach((doc) => {
        const pId = doc.pairId;
        if (!pId) return;

        if (!pairsMap[pId]) {
          pairsMap[pId] = {
            localId: pId,
            id: pId,
          };
        }

        if (doc.side === "front") {
          pairsMap[pId].front = doc.content;
          pairsMap[pId].frontData = doc.canvasData || null;
        } else {
          pairsMap[pId].back = doc.content;
          pairsMap[pId].backData = doc.canvasData || null;
        }

        if (doc.backgroundPairId) {
          pairsMap[pId].backgroundPairId = doc.backgroundPairId;
        }
      });

      const normalized = Object.values(pairsMap).map((p) => createLocalCard(p));

      let finalCards = normalized;
      let finalCurrentEditId = normalized[0]?.localId || null;

      if (
        !packageItem?.backgroundPairId &&
        normalized[0]?.backgroundPairId
      ) {
        setPackageBackgroundPairId(normalized[0].backgroundPairId);
      }

      setCards(finalCards);

      markCardsSnapshotSaved(finalCards);

      if (finalCurrentEditId) {
        setCurrentEditId(finalCurrentEditId);
        setActiveCanvasKey(`${finalCurrentEditId}-front`);
      }
    } catch (err) {
      setError("Lỗi tải thẻ từ Cloud");
    } finally {
      if (openProgressTimerRef.current) {
        clearInterval(openProgressTimerRef.current);
        openProgressTimerRef.current = null;
      }
      setLoading(false);
      setOpenProgress(0);
      setOpenProgressMessage("");
    }
  };

  const handleSwitchCard = (targetId) => {
    if (currentEditId === targetId) return;

    const nextCards = getCardsWithCurrentCanvasData();
    setCards(nextCards);

    resetCardTransform();
    setCurrentEditId(targetId);
    setActiveCanvasKey(`${targetId}-front`);
  };

  const handleAddCardPair = () => {
    setError("");
    setSaveMessage("");

    if (!ensurePackageName("Ban phai nhap ten goi truoc khi them the")) {
      return;
    }

    const previousEditId = currentEditId;
    const nextCardsBeforeAdd = getCardsWithCurrentCanvasData();
    const newCard = createLocalCard();
    const nextCards = [...nextCardsBeforeAdd, newCard];

    setCards(nextCards);
    resetCardTransform();
    setCurrentEditId(newCard.localId);
    setActiveCanvasKey(`${newCard.localId}-front`);

    if (previousEditId) {
      void saveCardsInBackground(nextCardsBeforeAdd, [previousEditId]);
    }

    setTimeout(() => {
      if (thumbnailListRef.current) {
        thumbnailListRef.current.scrollTo({
          left: thumbnailListRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }, 100);
  };
  const handleDeleteCardPair = (localId) => {
    setDeleteTargetId(localId);
  };

  const handleBackgroundPairChange = async (backgroundPairId) => {
    setError("");
    setSaveMessage("");
    setPackageBackgroundPairId(backgroundPairId);

    const nextCards = cards.map((card) => ({
      ...card,
      backgroundPairId,
    }));

    setCards(nextCards);

    onPackageUpdated?.({
      ...packageItem,
      backgroundPairId,
    });

    if (!user?.uid || !packageItem?.id) return;

    try {
      await updatePackageBackground(user.uid, packageItem.id, backgroundPairId);
    } catch (err) {
      console.error(err);
      setError("Lá»—i lÆ°u ná»n chung cá»§a gÃ³i");
    }
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

      if (target.id && user?.uid && packageItem?.id) {
        await deleteFlashcard(user.uid, packageItem.id, target.id);
      }

      removeCardFromSavedSnapshot(target.id);

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
      alert("Lỗi xóa thẻ");
    } finally {
      setIsDeletingCard(false);
    }
  };

  const handleImportClick = () => {
    if (!activeCanvasRef) {
      setError("Hãy chạm vào một mặt thẻ trước khi import ảnh");
      return;
    }

    document.getElementById("cards-import-input")?.click();
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await activeCanvasRef?.importImageFile?.(file);
    } finally {
      e.target.value = "";
    }
  };

  const saveAllCards = async ({ showMessage = true } = {}) => {
    if (!user || !packageItem?.id || savingAll) return false;

    try {
      setSavingAll(true);
      setError("");
      setSaveMessage("");

      const nextCards = getCardsWithCurrentCanvasData();

      const nextName = packageName?.trim() || "";
      const nextDescription = packageDescription?.trim() || "";
      const nextBackgroundPairId =
        packageBackgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID;

      const oldName = packageItem?.name?.trim() || "";
      const oldDescription = packageItem?.description?.trim() || "";
      const oldBackgroundPairId =
        packageItem?.backgroundPairId || DEFAULT_CARD_BACKGROUND_PAIR_ID;

      if (nextName !== oldName || nextDescription !== oldDescription) {
        await updatePackage(
          user.uid,
          packageItem.id,
          nextName,
          nextDescription,
        );
      }

      if (nextBackgroundPairId !== oldBackgroundPairId) {
        await updatePackageBackground(
          user.uid,
          packageItem.id,
          nextBackgroundPairId,
        );
      }

      const changedCards = getChangedCards(nextCards);

      if (changedCards.length === 0) {
        setCards(nextCards);
        markCardsSnapshotSaved(nextCards);
        if (showMessage) {
          setSaveMessage("Không có thay đổi mới cần lưu");
        }

        return true;
      }

      const savedResult = await bulkSaveCards(
        user.uid,
        packageItem.id,
        changedCards.map(toBulkCardPayload),
      );
      const savedCardMap = new Map(
        (savedResult?.cards || []).map((card) => [card.localId || card.id, card]),
      );
      const savedNextCards = nextCards.map((card) => {
        const savedCard = savedCardMap.get(card.localId);
        return savedCard
          ? {
              ...card,
              id: savedCard.localId || savedCard.id || card.localId,
            }
          : card;
      });

      setCards(savedNextCards);
      markCardsSnapshotSaved(savedNextCards);

      if (showMessage) {
        setSaveMessage(`Đã lưu ${changedCards.length} thẻ thay đổi`);
      }

      return true;
    } catch (err) {
      console.error(err);
      setError("Lỗi lưu thẻ lên server");
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
      onBack?.();
      return;
    }

    if (hasUnsavedCardChanges(currentSnapshot)) {
      setIsBackSaving(true);
      const saved = await saveAllCards({ showMessage: false });
      setIsBackSaving(false);

      if (!saved) return;
    }

    onBack?.();
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
    if (e.pointerType !== "touch") return;

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
    if (e.pointerType !== "touch") return;

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
      gesture.startZoom * (metrics.distance / gesture.startDistance),
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
    if (e.pointerType !== "touch") return;

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
      <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm'>
        <div className='mx-4 flex w-full max-w-sm flex-col items-center rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)]'>
          <div className='mb-4 h-32 w-32'>
            <Player
              autoplay
              loop
              src={savingLottie}
              className='h-full w-full'
            />
          </div>

          <h3 className='text-lg font-black text-slate-800'>Đang tải thẻ...</h3>

          <p className='mt-2 text-sm leading-6 text-slate-500'>
            Hệ thống đang chuẩn bị dữ liệu và nền thẻ cho bộ này.
          </p>

          <div className='mt-6 w-full'>
            <div className='mb-2 flex items-center justify-between text-xs font-black text-slate-500'>
              <span>Tiến độ tải</span>
              <span>{openProgress}%</span>
            </div>

            <div className='relative h-1.5 overflow-hidden rounded-full bg-slate-100 shadow-inner'>
              <div
                className='editor-open-gradient h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-pink-500 bg-[length:200%_200%] shadow-[0_0_18px_rgba(59,130,246,0.35)] transition-all duration-300 ease-out'
                style={{ width: `${openProgress}%` }}
              />
              <div className='pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/70' />
            </div>

            <div className='mt-3 text-xs font-bold text-slate-500'>
              {openProgressMessage ||
                "Hệ thống đang chuẩn bị dữ liệu và nền thẻ cho bộ này."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <input
        id='cards-import-input'
        type='file'
        accept='image/*'
        className='hidden'
        onChange={handleImportChange}
      />

      <div className='flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.34),transparent_26%),radial-gradient(circle_at_top_right,rgba(249,168,212,0.28),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#fff5fb_100%)]'>
        <div
          className='z-40 w-full shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl'
          style={{ touchAction: "manipulation" }}
        >
          <div className='mx-auto w-full max-w-[1500px]'>
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
              handleSaveAll={handleSaveAll}
              savingAll={savingAll || isBackSaving}
              nameError={nameError}
              cardsCount={cards.length}
              activeCanvasKey={activeCanvasKey}
              error={error}
              saveMessage={saveMessage}
            />

            <div className='px-3 pb-3 sm:px-5 lg:px-8'>
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
          <div className='z-30 w-full shrink-0 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md'>
            <div
              ref={thumbnailListRef}
              className='hide-scrollbar flex w-full items-center gap-4 overflow-x-auto px-6 py-3'
              style={{ touchAction: "pan-x" }}
              data-allow-touch
            >
              {cards.map((item) => {
                const isActive = item.localId === currentEditId;
                const saveStatus = cardSaveStatusMap[item.localId];
                const backgroundPair = getCardBackgroundPair(
                  packageBackgroundPairId || item.backgroundPairId,
                );

                return (
                  <button
                    key={item.localId}
                    type='button'
                    {...bindPress(() => handleSwitchCard(item.localId))}
                    className={cn(
                      "group relative flex shrink-0 cursor-pointer flex-col items-center gap-2 transition-all duration-300 ease-out",
                      isActive
                        ? "scale-110 opacity-100"
                        : "scale-100 opacity-50 hover:scale-105 hover:opacity-100",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-16 w-[100px] overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors duration-300",
                        isActive
                          ? "border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                          : "border-slate-200",
                      )}
                    >
                      <div className='relative h-full w-1/2 border-r border-slate-100 bg-sky-50/30'>
                        <img
                          src={backgroundPair.front}
                          alt=''
                          aria-hidden='true'
                          className='absolute inset-0 h-full w-full object-cover'
                        />
                        {item.front && (
                          <img
                            src={item.front}
                            alt='F'
                            className='absolute inset-0 h-full w-full object-cover'
                          />
                        )}
                      </div>

                      <div className='relative h-full w-1/2 bg-pink-50/30'>
                        <img
                          src={backgroundPair.back}
                          alt=''
                          aria-hidden='true'
                          className='absolute inset-0 h-full w-full object-cover'
                        />
                        {item.back && (
                          <img
                            src={item.back}
                            alt='B'
                            className='absolute inset-0 h-full w-full object-cover'
                          />
                        )}
                      </div>

                      {saveStatus && (
                        <span
                          className={cn(
                            "absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 shadow-sm",
                            saveStatus === "saving" && "bg-white text-sky-500",
                            saveStatus === "success" &&
                              "bg-emerald-500 text-white",
                            saveStatus === "error" && "bg-rose-500 text-white",
                          )}
                          title={
                            saveStatus === "saving"
                              ? "Đang lưu"
                              : saveStatus === "success"
                                ? "Đã lưu"
                                : "Lưu thất bại"
                          }
                        >
                          {saveStatus === "saving" && (
                            <FiLoader size={12} className='animate-spin' />
                          )}
                          {saveStatus === "success" && <FiCheck size={12} />}
                          {saveStatus === "error" && <FiX size={12} />}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                type='button'
                disabled={!canAddCard}
                {...bindPress(handleAddCardPair, !canAddCard)}
                className={cn(
                  "flex h-16 w-[100px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed bg-white/50 transition",
                  canAddCard
                    ? "border-slate-300 text-slate-400 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-500"
                    : "cursor-not-allowed border-slate-200 text-slate-300",
                )}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative flex w-full flex-1 justify-center overflow-hidden px-4 lg:px-8",
            cards.length === 0
              ? "items-center py-4"
              : "items-start pt-4 pb-4 lg:pt-6",
          )}
          style={{ touchAction: "none" }}
        >
          <AnimatePresence mode='wait'>
            {cards.length === 0 ? (
              <motion.div
                key='empty-state'
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
                  className='w-[850px] max-w-full origin-top'
                  initial={{ opacity: 0, scale: 0.1, y: -120 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.1, y: -120 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 30,
                    mass: 0.8,
                  }}
                >
                  <div
                    ref={cardGestureAreaRef}
                    className='relative'
                    style={{ touchAction: "none" }}
                    onPointerDownCapture={handleCardPointerDownCapture}
                    onPointerMoveCapture={handleCardPointerMoveCapture}
                    onPointerUpCapture={handleCardPointerEndCapture}
                    onPointerCancelCapture={handleCardPointerEndCapture}
                  >
                    <div
                      className='origin-top-left will-change-transform'
                      style={{
                        transform: `translate3d(${cardTransform.x}px, ${cardTransform.y}px, 0) scale(${cardTransform.zoom})`,
                        transformOrigin: "0 0",
                      }}
                    >
                      <FlashcardPairItem
                        item={currentCard}
                        index={cards.findIndex(
                          (c) => c.localId === currentEditId,
                        )}
                        activeCanvasKey={activeCanvasKey}
                        setActiveCanvasKey={setActiveCanvasKey}
                        setPairCardRef={setPairCardRef}
                        setCanvasRef={setCanvasRef}
                        toolbox={toolbox}
                        handleCanvasStatusChange={handleCanvasStatusChange}
                        handleDeleteCardPair={handleDeleteCardPair}
                        backgroundPairId={
                          packageBackgroundPairId ||
                          currentCard.backgroundPairId
                        }
                        onBackgroundPairChange={handleBackgroundPairChange}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>

          {cards.length > 0 && (
            <button
              type='button'
              {...bindPress(resetCardTransform)}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onPointerMoveCapture={(e) => e.stopPropagation()}
              onPointerUpCapture={(e) => e.stopPropagation()}
              data-allow-touch
              className='absolute right-4 top-4 z-50 inline-flex h-8 items-center gap-1.5 rounded-full border border-white/70 bg-white/65 px-2.5 text-[10px] font-black text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition hover:bg-white hover:text-slate-900'
              title='Trở về kích thước ban đầu'
            >
              <FiMaximize2 size={13} />
              <span>{Math.round(cardTransform.zoom * 100)}%</span>
            </button>
          )}
        </div>
      </div>

      {isBackSaving && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm'>
          <div className='mx-4 flex w-full max-w-sm flex-col items-center rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_24px_80px_rgba(15,23,42,0.25)]'>
            <div className='mb-4 h-32 w-32'>
              <Player
                autoplay
                loop
                src={savingLottie}
                className='h-full w-full'
              />
            </div>

            <h3 className='text-lg font-black text-slate-800'>
              Đang lưu thẻ...
            </h3>

            <p className='mt-2 text-sm leading-6 text-slate-500'>
              Vui lòng không thoát ứng dụng trong lúc hệ thống đang lưu dữ liệu.
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showBackConfirm}
        title='Thoát mà không lưu?'
        message='Mất hết ráng chịu nha! :))'
        confirmText='Thoát không lưu'
        cancelText='Ở lại'
        variant='warning'
        loading={false}
        lottieSrc={BACK_CONFIRM_MONKEY_LIST[backConfirmMonkeyIndex]}
        lottieClassName='h-28 w-28'
        onConfirm={handleConfirmBackWithoutSave}
        onClose={() => setShowBackConfirm(false)}
      />

      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title='Xóa cặp thẻ này?'
        message='Cả mặt trước và mặt sau của thẻ sẽ bị xóa.'
        confirmText='Xóa thẻ'
        cancelText='Hủy'
        variant='danger'
        loading={isDeletingCard}
        onConfirm={handleConfirmDeleteCard}
        onClose={() => setDeleteTargetId(null)}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            @keyframes editor-open-gradient-x {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
            .editor-open-gradient {
              animation: editor-open-gradient-x 3s ease infinite;
            }
          `,
        }}
      />
    </>
  );
}
