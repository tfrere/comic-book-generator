import { useSound } from "use-sound";
import { useState, useEffect } from "react";

const TRANSITION_SOUNDS = Array.from(
  { length: 3 },
  (_, i) => `/sounds/transitional-swipe-${i + 1}.mp3`
);

export function useTransitionSound(isSoundEnabled = true) {
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // Créer un tableau de hooks useSound pour chaque son
  const sounds = TRANSITION_SOUNDS.map((soundPath) => {
    const [play, { sound }] = useSound(soundPath, {
      volume: 0.1,
      interrupt: true,
    });
    return { play, sound };
  });

  // Vérifier quand tous les sons sont chargés
  useEffect(() => {
    const allSoundsLoaded = sounds.every(
      ({ sound }) => sound && sound.state() === "loaded"
    );
    if (allSoundsLoaded) {
      setSoundsLoaded(true);
    }
  }, [sounds]);

  const playRandomTransitionSound = () => {
    if (!isSoundEnabled || !soundsLoaded) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * sounds.length);
    try {
      sounds[randomIndex].play();
    } catch (error) {
      console.error("Error playing transition sound:", error);
    }
  };

  return playRandomTransitionSound;
}
