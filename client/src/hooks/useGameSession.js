import { useState, useEffect } from "react";
import { universeApi } from "../utils/api";

export const useGameSession = () => {
  const [sessionId, setSessionId] = useState(null);
  const [universe, setUniverse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        const { session_id, base_story, style, genre, epoch } =
          await universeApi.generate();

        setSessionId(session_id);
        setUniverse({
          base_story,
          style,
          genre,
          epoch,
        });
      } catch (err) {
        setError(err.message || "Failed to initialize game session");
      } finally {
        setIsLoading(false);
      }
    };

    initializeGame();
  }, []);

  return {
    sessionId,
    universe,
    isLoading,
    error,
  };
};
