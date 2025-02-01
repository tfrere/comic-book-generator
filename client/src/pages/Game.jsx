import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
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
import { useNarrator } from "../hooks/useNarrator";
import { usePageSound } from "../hooks/usePageSound";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { useTransitionSound } from "../hooks/useTransitionSound";
import { useWritingSound } from "../hooks/useWritingSound";
import { ComicLayout } from "../layouts/ComicLayout";
import { storyApi, universeApi } from "../utils/api";
import { GameProvider, useGame } from "../contexts/GameContext";

// Constants
const SOUND_ENABLED_KEY = "sound_enabled";
const GAME_INITIALIZED_KEY = "game_initialized";

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
  } = useGame();

  const storyContainerRef = useRef(null);
  const { downloadStoryImage } = useStoryCapture();
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [isDebugVisible, setIsDebugVisible] = useState(false);

  const messages = [
    "teaching robots to tell bedtime stories...",
    "bribing pixels to make pretty pictures...",
    "calibrating the multiverse...",
  ];
  const transitionMessages = [
    "Creating your universe...",
    "Drawing the first scene...",
    "Preparing your story...",
    "Assembling the comic panels...",
  ];

  const { isNarratorSpeaking, playNarration, stopNarration } =
    useNarrator(isSoundEnabled);
  const playPageSound = usePageSound(isSoundEnabled);
  const playWritingSound = useWritingSound(isSoundEnabled);
  const playTransitionSound = useTransitionSound(isSoundEnabled);
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

  // Modify the transition sound effect to only play if audio is initialized
  useEffect(() => {
    if (
      !isSessionLoading &&
      sessionId &&
      !error &&
      !sessionError &&
      audioInitialized
    ) {
      playTransitionSound();
    }
  }, [isSessionLoading, sessionId, error, sessionError, audioInitialized]);

  // Jouer le son de transition quand on passe de la slot machine au jeu
  useEffect(() => {
    if (!isInitialLoading && audioInitialized) {
      playTransitionSound();
    }
  }, [isInitialLoading, audioInitialized, playTransitionSound]);

  // Sauvegarder l'état du son dans le localStorage
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, isSoundEnabled);
  }, [isSoundEnabled]);

  // Add effect for message rotation
  useEffect(() => {
    if (showLoadingMessages) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % messages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showLoadingMessages]);

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

  const handleBack = () => {
    playPageSound();
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
      <Box sx={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1a" }}>
        <LoadingScreen
          icon="universe"
          messages={[
            "Waking up sleepy AI...",
            "Calibrating the multiverse...",
            "Gathering comic book inspiration...",
            // "Creating a new universe...",
            // "Drawing the first panels...",
            // "Setting up the story...",
          ]}
        />
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
      <Box sx={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1a" }}>
        <LoadingScreen messages={transitionMessages} icon="story" />
      </Box>
    );
  }

  // Afficher les messages de chargement uniquement pendant le chargement initial
  if (isLoading && showLoadingMessages && segments.length === 0) {
    return (
      <Box sx={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1a" }}>
        <LoadingScreen
          messages={messages}
          currentMessage={messages[loadingMessage]}
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
        {/* Header controls */}
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            p: 2,
            // backgroundColor: "rgba(18, 18, 18, 0.8)",
            // backdropFilter: "blur(8px)",
          }}
        >
          <Box>
            <Tooltip title="Retour au menu">
              <IconButton
                onClick={() => navigate("/tutorial")}
                sx={{ color: "white" }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip
              title={isSoundEnabled ? "Désactiver le son" : "Activer le son"}
            >
              <IconButton
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                sx={{ color: "white" }}
              >
                {isSoundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Capturer l'histoire">
              <IconButton
                onClick={() => downloadStoryImage(storyContainerRef)}
                sx={{ color: "white" }}
              >
                <PhotoCameraOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

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
            <ComicLayout />
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
