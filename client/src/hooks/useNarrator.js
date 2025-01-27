import { useState, useRef } from "react";
import { storyApi } from "../utils/api";

export function useNarrator(isEnabled = true) {
  const [isNarratorSpeaking, setIsNarratorSpeaking] = useState(false);
  const audioRef = useRef(new Audio());

  const stopNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsNarratorSpeaking(false);
    }
  };

  const playNarration = async (text) => {
    if (!isEnabled) return;

    try {
      // Stop any ongoing narration
      stopNarration();

      // Get audio from API
      const response = await storyApi.narrate(text);

      if (!response || !response.audio_base64) {
        throw new Error("Pas d'audio reçu du serveur");
      }

      // Create audio blob and URL
      const audioBlob = await fetch(
        `data:audio/mpeg;base64,${response.audio_base64}`
      ).then((r) => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);

      // Set up audio element
      audioRef.current.src = audioUrl;
      audioRef.current.onplay = () => setIsNarratorSpeaking(true);
      audioRef.current.onended = () => {
        setIsNarratorSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        console.error("Error playing audio");
        setIsNarratorSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Play audio
      await audioRef.current.play();
    } catch (error) {
      console.error("Error in playNarration:", error);
      setIsNarratorSpeaking(false);
    }
  };

  return {
    isNarratorSpeaking,
    playNarration,
    stopNarration,
  };
}
