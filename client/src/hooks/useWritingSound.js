import { useSoundEffect } from "./useSoundEffect";

export function useWritingSound(isSoundEnabled = true) {
  return useSoundEffect({
    basePath: "/sounds/drawing-",
    numSounds: 5,
    volume: 0.3,
    enabled: isSoundEnabled,
  });
}
