import { useState, useEffect, useCallback } from "react";

export const useSlotMachine = ({
  items = [],
  duration = 2000,
  interval = 50,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const spin = useCallback(() => {
    if (!items.length) return;

    setIsSpinning(true);
    setIsStopped(false);

    let startTime = Date.now();
    let currentTimer;

    const updateSlot = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= duration) {
        setIsSpinning(false);
        setIsStopped(true);
        return;
      }

      // Calculer la vitesse de rotation en fonction du temps écoulé
      const speed = Math.max(1, Math.floor((duration - elapsed) / 200));

      setCurrentIndex((prev) => (prev + speed) % items.length);

      currentTimer = setTimeout(updateSlot, interval);
    };

    updateSlot();

    return () => {
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    };
  }, [items, duration, interval]);

  const getCurrentItem = useCallback(() => {
    return items[currentIndex];
  }, [items, currentIndex]);

  return {
    currentItem: getCurrentItem(),
    isSpinning,
    isStopped,
    spin,
  };
};
