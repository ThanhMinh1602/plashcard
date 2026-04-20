import { useEffect, useRef, useState } from 'react';
import { DEFAULT_STATUS } from '../constants';

export default function useCanvasRegistry({ cards, packageId }) {
  const [activeCanvasKey, setActiveCanvasKey] = useState(null);
  const [canvasStatusMap, setCanvasStatusMap] = useState({});

  const canvasRefs = useRef({});
  const pairCardRefs = useRef({});
  const pendingScrollToCardRef = useRef(null);

  useEffect(() => {
    setActiveCanvasKey(null);
    setCanvasStatusMap({});
    canvasRefs.current = {};
    pairCardRefs.current = {};
    pendingScrollToCardRef.current = null;
  }, [packageId]);

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

  const setCanvasRef = (key) => (instance) => {
    if (instance) {
      canvasRefs.current[key] = instance;
    } else {
      delete canvasRefs.current[key];
    }
  };

  const getCanvasRefByKey = (key) => canvasRefs.current[key] || null;

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

  const queueScrollToCard = (localId) => {
    pendingScrollToCardRef.current = localId;
  };

  const removeCardBindings = (localId) => {
    delete canvasRefs.current[`${localId}-front`];
    delete canvasRefs.current[`${localId}-back`];
    delete pairCardRefs.current[localId];

    setCanvasStatusMap((prev) => {
      const next = { ...prev };
      delete next[`${localId}-front`];
      delete next[`${localId}-back`];
      return next;
    });
  };

  const activeCanvasRef = activeCanvasKey
    ? canvasRefs.current[activeCanvasKey]
    : null;

  const activeStatus = canvasStatusMap[activeCanvasKey] || DEFAULT_STATUS;

  return {
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
  };
}