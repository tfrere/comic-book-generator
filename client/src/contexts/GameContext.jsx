import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { storyApi } from "../utils/api";
import { getNextLayoutType, LAYOUTS } from "../layouts/config";

// Constants
const DISABLE_NARRATOR = true; // Désactive complètement le narrateur

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [segments, setSegments] = useState([]);
  const [choices, setChoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNarratorSpeaking, setIsNarratorSpeaking] = useState(false);
  const [heroName, setHeroName] = useState("");
  const [loadedPages, setLoadedPages] = useState(new Set());
  const [showChoices, setShowChoices] = useState(true);
  const [showTransitionSpinner, setShowTransitionSpinner] = useState(false);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);
  const [universe, setUniverse] = useState(null);
  const [slotMachineState, setSlotMachineState] = useState({
    style: null,
    genre: null,
    epoch: null,
    activeIndex: -1,
  });
  const [showSlotMachine, setShowSlotMachine] = useState(() => {
    return !localStorage.getItem("game_initialized");
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showLoadingMessages, setShowLoadingMessages] = useState(false);
  const [isTransitionLoading, setIsTransitionLoading] = useState(false);
  const [layoutCounter, setLayoutCounter] = useState(0);

  // Gestion de la narration
  const stopNarration = useCallback(() => {
    storyApi.stopNarration();
    setIsNarratorSpeaking(false);
  }, []);

  const playNarration = useCallback(async (text) => {
    if (DISABLE_NARRATOR) return; // Early return si le narrateur est désactivé

    try {
      setIsNarratorSpeaking(true);
      await storyApi.playNarration(text);
    } catch (error) {
      console.error("Error playing narration:", error);
    } finally {
      setIsNarratorSpeaking(false);
    }
  }, []);

  // Effect pour arrêter la narration quand le composant est démonté
  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, [stopNarration]);

  // Gestion du chargement des pages
  const handlePageLoaded = useCallback((pageIndex) => {
    setLoadedPages((prev) => {
      const newSet = new Set(prev);
      newSet.add(pageIndex);
      return newSet;
    });
  }, []);

  // Générer les images pour un segment
  const generateImagesForStory = useCallback(
    async (imagePrompts, segmentIndex, currentSegments) => {
      try {
        let localSegments = [...currentSegments];
        const images = Array(imagePrompts.length).fill(null);

        // Obtenir le session_id du segment actuel
        const session_id = localSegments[segmentIndex].session_id;
        if (!session_id) {
          throw new Error("No session_id available for image generation");
        }

        // Déterminer le layout en fonction du nombre d'images
        const layoutType = getNextLayoutType(
          layoutCounter,
          imagePrompts.length
        );
        setLayoutCounter((prev) => prev + 1);

        // Initialiser le segment avec le layout type
        localSegments[segmentIndex] = {
          ...localSegments[segmentIndex],
          layoutType,
          images: Array(imagePrompts.length).fill(null),
          imagePrompts,
          isLoading: true,
        };

        // Mettre à jour les segments et cacher le spinner de transition
        setSegments([...localSegments]);
        setShowTransitionSpinner(false);

        // Générer toutes les images
        for (
          let promptIndex = 0;
          promptIndex < imagePrompts.length;
          promptIndex++
        ) {
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;

          // Obtenir les dimensions pour ce panneau
          const panelDimensions = LAYOUTS[layoutType].panels[promptIndex];
          if (!panelDimensions) {
            console.error(
              `No panel dimensions found for index ${promptIndex} in layout ${layoutType}`
            );
            continue;
          }

          while (retryCount < maxRetries && !success) {
            try {
              const result = await storyApi.generateImage(
                imagePrompts[promptIndex],
                panelDimensions.width,
                panelDimensions.height,
                session_id
              );

              if (!result) {
                throw new Error("Pas de résultat de génération d'image");
              }

              if (result.success) {
                images[promptIndex] = result.image_base64;

                // Mettre à jour le segment avec la nouvelle image
                localSegments[segmentIndex] = {
                  ...localSegments[segmentIndex],
                  images: [...images],
                  isLoading: true, // On garde isLoading à true jusqu'à ce que toutes les images soient générées
                };
                setSegments([...localSegments]);

                success = true;
              } else {
                console.warn(
                  `Failed to generate image ${promptIndex + 1}, attempt ${
                    retryCount + 1
                  }`
                );
                retryCount++;
              }
            } catch (error) {
              console.error(
                `Error generating image ${promptIndex + 1}:`,
                error
              );
              retryCount++;
            }
          }
        }

        // Une fois toutes les images générées, marquer le segment comme chargé
        localSegments[segmentIndex] = {
          ...localSegments[segmentIndex],
          isLoading: false,
        };
        setSegments([...localSegments]);
      } catch (error) {
        console.error("Error in generateImagesForStory:", error);
      }
    },
    [layoutCounter, setLayoutCounter, setSegments]
  );

  const regenerateImage = async (prompt, session_id) => {
    try {
      if (!session_id) {
        console.error("No session_id provided for image regeneration");
        return null;
      }

      const response = await storyApi.generateImage(
        prompt,
        512,
        512,
        session_id
      );
      if (response.success && response.image_base64) {
        return response.image_base64;
      }
      return null;
    } catch (error) {
      console.error("Error regenerating image:", error);
      return null;
    }
  };

  // Gestion des choix
  const handleChoice = useCallback(
    async (choiceId, customText) => {
      if (isLoading) return;

      // Arrêter toute narration en cours avant de faire un nouveau choix
      stopNarration();

      // Montrer le spinner seulement si ce n'est pas la première page
      if (segments.length > 0) {
        setShowTransitionSpinner(true);
      }
      setIsLoading(true);
      setShowChoices(false);

      try {
        let response;
        if (choiceId === "custom") {
          response = await storyApi.makeCustomChoice(
            customText,
            universe?.session_id
          );
        } else {
          response = await storyApi.makeChoice(choiceId, universe?.session_id);
        }

        // Mettre à jour les choix (mais ne pas les afficher encore)
        setChoices(response.choices);

        // Formater le segment avec le bon format
        const formattedSegment = {
          text: response.story_text,
          rawText: response.story_text,
          choices: response.choices || [],
          isLoading: true,
          images: [],
          isDeath: response.is_death || false,
          isVictory: response.is_victory || false,
          time: response.time,
          location: response.location,
          session_id: universe?.session_id,
          is_last_step: response.is_last_step,
          hasBeenRead: false,
        };

        // Si pas d'images à générer
        if (!response.image_prompts || response.image_prompts.length === 0) {
          formattedSegment.isLoading = false;
          setSegments((prev) => [...prev, formattedSegment]);
          setIsLoading(false);
          setShowChoices(true);
          setShowTransitionSpinner(false);
          return;
        }

        // Sinon, générer les images
        const currentSegments = [...segments];
        const newSegmentIndex = currentSegments.length;

        await generateImagesForStory(response.image_prompts, newSegmentIndex, [
          ...currentSegments,
          formattedSegment,
        ]);

        // Une fois toutes les images générées
        setIsLoading(false);
        setShowChoices(true);
      } catch (error) {
        console.error("Error making choice:", error);
        setError(error);
        setIsLoading(false);
        setShowTransitionSpinner(false);
        setShowChoices(true);
      }
    },
    [
      isLoading,
      universe?.session_id,
      generateImagesForStory,
      segments,
      stopNarration,
    ]
  );

  // Reset du jeu
  const resetGame = useCallback(() => {
    setSegments([]);
    setChoices([]);
    setIsLoading(false);
    setIsNarratorSpeaking(false);
    setLoadedPages(new Set());
  }, []);

  // Obtenir le dernier segment
  const getLastSegment = useCallback(() => {
    if (!segments || segments.length === 0) return null;
    return segments[segments.length - 1];
  }, [segments]);

  // Vérifier si le jeu est terminé
  const isGameOver = useCallback(() => {
    const lastSegment = getLastSegment();
    return lastSegment?.isDeath || lastSegment?.isVictory;
  }, [getLastSegment]);

  const value = {
    // État
    segments,
    setSegments,
    choices,
    setChoices,
    isLoading,
    setIsLoading,
    isNarratorSpeaking,
    setIsNarratorSpeaking,
    heroName,
    setHeroName,
    loadedPages,
    showChoices,
    setShowChoices,
    showTransitionSpinner,
    error,
    setError,
    gameState,
    setGameState,
    currentStory,
    setCurrentStory,
    universe,
    setUniverse,
    slotMachineState,
    setSlotMachineState,
    showSlotMachine,
    setShowSlotMachine,
    isInitialLoading,
    setIsInitialLoading,
    showLoadingMessages,
    setShowLoadingMessages,
    isTransitionLoading,
    setIsTransitionLoading,
    layoutCounter,
    setLayoutCounter,

    // Actions
    handlePageLoaded,
    onChoice: handleChoice,
    stopNarration,
    playNarration,
    resetGame,
    getLastSegment,
    isGameOver,

    // Helpers
    isPageLoaded: (pageIndex) => loadedPages.has(pageIndex),
    areAllPagesLoaded: (totalPages) => loadedPages.size === totalPages,
    generateImagesForStory,
    regenerateImage,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
