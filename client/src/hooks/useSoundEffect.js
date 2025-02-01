import { useSound } from "use-sound";
import { useState, useEffect } from "react";

/**
 * A generic hook for managing sound effects
 * @param {Object} config - Configuration object
 * @param {string} config.basePath - Base path for the sound files (e.g. "/sounds/page-flip-")
 * @param {number} config.numSounds - Number of sound files (1 to numSounds)
 * @param {number} config.volume - Volume level (0 to 1)
 * @param {boolean} config.interrupt - Whether to interrupt playing sound
 * @param {boolean} config.enabled - Whether sound is enabled
 * @returns {Function} Function to play a random sound from the collection
 */
export function useSoundEffect({
  basePath,
  numSounds,
  volume = 0.5,
  interrupt = true,
  enabled = true,
}) {
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // Create array of sound paths
  const soundPaths = Array.from(
    { length: numSounds },
    (_, i) => `${basePath}${i + 1}.mp3`
  );

  // Initialize sounds
  const sounds = soundPaths.map((soundPath) => {
    const [play, { sound }] = useSound(soundPath, {
      volume,
      interrupt,
    });
    return { play, sound };
  });

  // Check when all sounds are loaded
  useEffect(() => {
    const checkSoundsLoaded = () => {
      const allSoundsLoaded = sounds.every(
        ({ sound }) => sound && sound.state() === "loaded"
      );
      if (allSoundsLoaded) {
        setSoundsLoaded(true);
      }
    };

    const interval = setInterval(checkSoundsLoaded, 100);
    return () => clearInterval(interval);
  }, [sounds]);

  // Function to play a random sound
  const playRandomSound = () => {
    if (!enabled || !soundsLoaded || sounds.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * sounds.length);
    try {
      sounds[randomIndex].play();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  return playRandomSound;
}
