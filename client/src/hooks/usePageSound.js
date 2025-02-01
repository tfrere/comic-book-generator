import { useSoundEffect } from "./useSoundEffect";

export function usePageSound(isSoundEnabled = true) {
  return useSoundEffect({
    basePath: "/sounds/page-flip-",
    numSounds: 7,
    volume: 0.5,
    enabled: isSoundEnabled,
  });
}
