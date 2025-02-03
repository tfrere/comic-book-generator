import { Box, IconButton, LinearProgress, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorDisplay } from "../components/ErrorDisplay";
import { LoadingScreen } from "../components/LoadingScreen";
import { TalkWithSarah } from "../components/TalkWithSarah";
import { GameDebugPanel } from "../components/GameDebugPanel";
import { UniverseSlotMachine } from "../components/UniverseSlotMachine";
import { useGameSession } from "../hooks/useGameSession";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { ComicLayout } from "../layouts/ComicLayout";
import { storyApi, universeApi } from "../utils/api";
import { GameProvider, useGame } from "../contexts/GameContext";
import { StoryChoices } from "../components/StoryChoices";
import { useSoundSystem } from "../contexts/SoundContext";
import { GameNavigation } from "../components/GameNavigation";
import { RotatingMessage } from "../components/RotatingMessage";

// Constants
const SOUND_ENABLED_KEY = "sound_enabled";
const GAME_INITIALIZED_KEY = "game_initialized";

const TRANSITION_MESSAGES = [
  "Opening the portal...",
  "Take a deep breath...",
  "Let's start...",
];

const SESSION_LOADING_MESSAGES = [
  "Waking up sleepy AI...",
  "Calibrating the multiverse...",
  "Gathering comic book inspiration...",
];

function GameContent() {
  const navigate = useNavigate();
  const { universeId } = useParams();
  const {
    segments,
    setSegments,
    choices,
    setChoices,
    isLoading,
    setIsLoading,
    heroName,
    setHeroName,
    showChoices,
    setShowChoices,
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
    resetGame,
    generateImagesForStory,
    isNarratorSpeaking,
    playNarration,
    stopNarration,
  } = useGame();

  const storyContainerRef = useRef(null);
  const { downloadStoryImage } = useStoryCapture();
  const [audioInitialized, setAudioInitialized] = useState(false);
  const { isSoundEnabled, setIsSoundEnabled, playSound } = useSoundSystem();
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [isDebugVisible, setIsDebugVisible] = useState(false);

  const {
    sessionId,
    universe: gameUniverse,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useGameSession();

  // Initialize audio after user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!audioInitialized) {
        // Create and resume audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioCtx.resume().then(() => {
          setAudioInitialized(true);
          // Remove event listeners after initialization
          window.removeEventListener("click", handleUserInteraction);
          window.removeEventListener("keydown", handleUserInteraction);
          window.removeEventListener("touchstart", handleUserInteraction);
        });
      }
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [audioInitialized]);

  // Jouer le son de transition quand on passe de la slot machine au jeu
  useEffect(() => {
    if (!isInitialLoading && audioInitialized) {
      playSound("transition");
    }
  }, [isInitialLoading, audioInitialized]);

  // Sauvegarder l'état du son dans le localStorage
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, isSoundEnabled);
    storyApi.setSoundEnabled(isSoundEnabled);
  }, [isSoundEnabled]);

  // Handle keyboard events for debug panel
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key.toLowerCase() === "d") {
        setIsDebugVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Update game state when story segments change
  useEffect(() => {
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      setCurrentStory(lastSegment);
      setGameState((prev) => ({
        ...prev,
        story_beat: segments.length - 1,
        story_history: segments,
      }));
    }
  }, [segments]);

  // Initialize game state with universe info
  useEffect(() => {
    if (gameUniverse) {
      setGameState({
        universe_style: gameUniverse.style,
        universe_genre: gameUniverse.genre,
        universe_epoch: gameUniverse.epoch,
        universe_macguffin: gameUniverse.macguffin,
        hero_name: gameUniverse.hero_name || "the hero",
        story_beat: 0,
        story_history: [],
      });
    }
  }, [gameUniverse]);

  // Charger l'univers initial
  useEffect(() => {
    const loadUniverse = async () => {
      setIsLoading(true);
      try {
        const universeData = await universeApi.generate();
        console.log("Universe Data:", universeData);

        // Mettre à jour la slot machine avec les données de l'univers
        setSlotMachineState({
          style: universeData.style.name,
          genre: universeData.genre,
          epoch: universeData.epoch,
          activeIndex: 3, // Pour montrer que tous les slots sont remplis
        });

        setHeroName(universeData.hero_name);
        setUniverse(universeData);

        // Démarrer l'histoire
        const response = await storyApi.start(universeData.session_id);
        console.log("Initial Story Response:", response);

        // Formater le segment avec le bon format
        const formattedSegment = {
          text: response.story_text,
          rawText: response.story_text,
          choices: response.choices || [],
          isLoading: false,
          images: [],
          isDeath: response.is_death || false,
          isVictory: response.is_victory || false,
          time: response.time,
          location: response.location,
          session_id: universeData.session_id,
        };

        setSegments([formattedSegment]);
        setChoices(response.choices);

        // Générer les images pour le premier segment
        if (response.image_prompts && response.image_prompts.length > 0) {
          await generateImagesForStory(response.image_prompts, 0, [
            formattedSegment,
          ]);
        }

        // La slot machine sera cachée automatiquement via le callback onComplete
        setShowSlotMachine(false);
      } catch (error) {
        console.error("Error loading universe:", error);
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUniverse();
    return () => resetGame(); // Nettoyer l'état quand on quitte
  }, [universeId]);

  // Gérer la transition vers le jeu
  useEffect(() => {
    if (isTransitionLoading) {
      // Attendre 3 secondes avant de passer au jeu
      const timer = setTimeout(() => {
        setIsTransitionLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isTransitionLoading]);

  // Effet pour gérer le scroll et la narration des nouveaux segments
  useEffect(() => {
    const loadedSegments = segments.filter((segment) => !segment.isLoading);
    const lastSegment = loadedSegments[loadedSegments.length - 1];
    const hasNewSegment = lastSegment && !lastSegment.hasBeenRead;

    if (storyContainerRef.current && hasNewSegment && !isNarratorSpeaking) {
      // Arrêter la narration en cours
      if (isSoundEnabled) {
        stopNarration();
      }

      // Scroll to the right
      storyContainerRef.current.scrollTo({
        left: storyContainerRef.current.scrollWidth,
        behavior: "smooth",
      });

      let isCleanedUp = false;

      // Attendre que le scroll soit terminé avant de démarrer la narration
      const timeoutId = setTimeout(() => {
        if (isCleanedUp) return;

        // Jouer le son d'écriture
        playSound("writing");

        // Démarrer la narration après un court délai
        setTimeout(() => {
          if (isCleanedUp) return;

          if (
            lastSegment &&
            lastSegment.text &&
            isSoundEnabled &&
            !isNarratorSpeaking
          ) {
            playNarration(lastSegment.text);
          }
          // Marquer le segment comme lu
          lastSegment.hasBeenRead = true;
        }, 500);
      }, 500);

      return () => {
        isCleanedUp = true;
        clearTimeout(timeoutId);
        if (isSoundEnabled) {
          stopNarration();
        }
      };
    }
  }, [
    segments,
    playNarration,
    stopNarration,
    isSoundEnabled,
    playSound,
    isNarratorSpeaking,
  ]);

  // Effet pour arrêter la narration quand le son est désactivé
  useEffect(() => {
    if (!isSoundEnabled) {
      stopNarration();
    }
  }, [isSoundEnabled, stopNarration]);

  const handleBack = () => {
    playSound("page");
    navigate("/tutorial");
  };

  const handleCaptureStory = async () => {
    await downloadStoryImage(storyContainerRef, `your-story-${Date.now()}.png`);
  };

  // Show session error if any
  if (sessionError) {
    return (
      <ErrorDisplay
        message="Impossible d'initialiser la session de jeu. Veuillez rafraîchir la page."
        error={sessionError}
      />
    );
  }

  // Show loading state while session is initializing
  if (isSessionLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "background.default",
        }}
      >
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        />
        <RotatingMessage messages={SESSION_LOADING_MESSAGES} isVisible={true} />
      </Box>
    );
  }

  // Afficher la slot machine pendant le chargement initial
  if (isInitialLoading) {
    return (
      <Box sx={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1a" }}>
        <UniverseSlotMachine
          style={slotMachineState.style}
          genre={slotMachineState.genre}
          epoch={slotMachineState.epoch}
          activeIndex={slotMachineState.activeIndex}
          onComplete={() => {
            setIsInitialLoading(false);
            setIsTransitionLoading(true);
          }}
        />
      </Box>
    );
  }

  // Afficher l'écran de transition après la slot machine
  if (isTransitionLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "background.default",
        }}
      >
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        />
        <RotatingMessage
          messages={TRANSITION_MESSAGES}
          isVisible={isTransitionLoading}
        />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ backgroundColor: "#121212", width: "100%" }}
    >
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "grey.900",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <GameNavigation />
        {/* Main content */}
        <Box
          ref={storyContainerRef}
          sx={{
            height: "100%",
            width: "100%",
            position: "relative",
            backgroundColor: "grey.900",
          }}
        >
          {error ? (
            <ErrorDisplay error={error} onRetry={resetGame} />
          ) : showSlotMachine ? (
            <UniverseSlotMachine state={slotMachineState} />
          ) : (
            <Box
              sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: "85%",
                  width: "100%",
                  overflow: "auto",
                }}
              >
                <ComicLayout />
              </Box>
              <Box
                sx={{
                  height: "15%",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  px: 2,
                }}
              >
                <Box sx={{ width: "100%", maxWidth: "800px" }}>
                  <StoryChoices />
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {isDebugVisible && (
          <GameDebugPanel
            gameState={gameState}
            storySegments={segments}
            currentChoices={choices}
            showChoices={showChoices}
            isLoading={isLoading}
          />
        )}

        {/* Sarah chat interface */}
        <TalkWithSarah />
      </Box>
    </motion.div>
  );
}

export function Game() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default Game;
