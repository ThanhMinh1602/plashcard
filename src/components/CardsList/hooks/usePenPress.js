import { useCallback, useRef } from 'react';

export default function usePenPress() {
  const lastPointerPressTimeRef = useRef(0);

  const bindPress = useCallback((handler, disabled = false) => {
    return {
      onPointerUp: (e) => {
        if (disabled) return;

        if (e.pointerType === 'pen' || e.pointerType === 'touch') {
          e.preventDefault();
          e.stopPropagation();

          lastPointerPressTimeRef.current = Date.now();
          handler?.(e);
        }
      },

      onClick: (e) => {
        if (disabled) return;

        const justHandledByPointer =
          Date.now() - lastPointerPressTimeRef.current < 500;

        if (justHandledByPointer) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        handler?.(e);
      },
    };
  }, []);

  return bindPress;
}