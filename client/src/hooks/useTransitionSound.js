import { useSoundEffect } from "./useSoundEffect";

export function useTransitionSound(isSoundEnabled = true) {
  return useSoundEffect({
    basePath: "/sounds/transitional-swipe-",
    numSounds: 3,
    volume: 0.1,
    enabled: isSoundEnabled,
  });
}
