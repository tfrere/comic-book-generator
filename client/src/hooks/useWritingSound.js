import { useSound } from "use-sound";
import { useState, useEffect } from "react";

const PAGE_SOUNDS = Array.from(
  { length: 5 },
  (_, i) => `/sounds/drawing-${i + 1}.mp3`
);

export function useWritingSound() {
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // Créer un tableau de hooks useSound pour chaque son
  const sounds = PAGE_SOUNDS.map((soundPath) => {
    const [play, { sound }] = useSound(soundPath, {
      volume: 1,
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

  const playRandomPageSound = () => {
    if (!soundsLoaded) {
      console.warn("Page sounds not loaded yet");
      return;
    }

    const randomIndex = Math.floor(Math.random() * sounds.length);
    try {
      sounds[randomIndex].play();
    } catch (error) {
      console.error("Error playing page sound:", error);
    }
  };

  return playRandomPageSound;
}
