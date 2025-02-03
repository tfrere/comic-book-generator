import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useSound } from "use-sound";
import { storyApi } from "../utils/api";

const SOUND_ENABLED_KEY = "sound_enabled";

// Définition des sons du jeu
const SOUNDS = {
  page: {
    files: Array.from(
      { length: 7 },
      (_, i) => `/sounds/page-flip-${i + 1}.mp3`
    ),
    volume: 0.5,
  },
  writing: {
    files: Array.from({ length: 5 }, (_, i) => `/sounds/drawing-${i + 1}.mp3`),
    volume: 0.3,
  },
  transition: {
    files: Array.from(
      { length: 3 },
      (_, i) => `/sounds/transitional-swipe-${i + 1}.mp3`
    ),
    volume: 0.1,
  },
  talkySarah: {
    on: "/sounds/talky-walky-on.mp3",
    off: "/sounds/talky-walky-off.mp3",
    volume: 0.5,
  },
};

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });

  // Initialiser l'audio context après interaction utilisateur
  useEffect(() => {
    const handleInteraction = () => {
      storyApi.handleUserInteraction();
      // Retirer les listeners une fois qu'on a eu une interaction
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // Initialiser tous les sons
  const soundInstances = {};
  Object.entries(SOUNDS).forEach(([category, config]) => {
    if (Array.isArray(config.files)) {
      // Pour les sons avec plusieurs variations
      soundInstances[category] = config.files.map((file) => {
        const [play] = useSound(file, { volume: config.volume });
        return play;
      });
    } else if (typeof config.files === "string") {
      // Pour les sons uniques
      const [play] = useSound(config.files, { volume: config.volume });
      soundInstances[category] = play;
    } else {
      // Pour les sons avec sous-catégories (comme talkySarah)
      soundInstances[category] = {};
      Object.entries(config).forEach(([key, value]) => {
        if (key !== "volume" && typeof value === "string") {
          const [play] = useSound(value, { volume: config.volume });
          soundInstances[category][key] = play;
        }
      });
    }
  });

  // Sauvegarder l'état du son dans le localStorage
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, isSoundEnabled);
  }, [isSoundEnabled]);

  // Fonction pour jouer un son
  const playSound = useCallback(
    (category, subCategory = null) => {
      if (!isSoundEnabled) return;

      try {
        if (subCategory) {
          // Pour les sons avec sous-catégories (comme talkySarah.on)
          soundInstances[category][subCategory]?.();
        } else if (Array.isArray(soundInstances[category])) {
          // Pour les sons avec variations, jouer un son aléatoire
          const randomIndex = Math.floor(
            Math.random() * soundInstances[category].length
          );
          soundInstances[category][randomIndex]?.();
        } else {
          // Pour les sons uniques
          soundInstances[category]?.();
        }
      } catch (error) {
        console.warn(`Error playing sound ${category}:`, error);
      }
    },
    [isSoundEnabled, soundInstances]
  );

  const value = {
    isSoundEnabled,
    setIsSoundEnabled,
    playSound,
  };

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export const useSoundSystem = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSoundSystem must be used within a SoundProvider");
  }
  return context;
};
