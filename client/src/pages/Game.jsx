import { useState, useEffect, useRef } from "react";
import {
  Box,
  LinearProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ComicLayout } from "../layouts/ComicLayout";
import { storyApi } from "../utils/api";
import { useNarrator } from "../hooks/useNarrator";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { usePageSound } from "../hooks/usePageSound";
import { useWritingSound } from "../hooks/useWritingSound";
import { useGameSession } from "../hooks/useGameSession";
import { StoryChoices } from "../components/StoryChoices";
import { ErrorDisplay } from "../components/ErrorDisplay";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreateIcon from "@mui/icons-material/Create";
import { getNextLayoutType, LAYOUTS } from "../layouts/config";
import { LoadingScreen } from "../components/LoadingScreen";

// Constants
const SOUND_ENABLED_KEY = "sound_enabled";

// Function to convert text with ** to Chip elements
const formatTextWithBold = (text, isInPanel = false) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return part.slice(2, -2);
    }
    return part;
  });
};

// Function to strip bold markers from text for narration
const stripBoldMarkers = (text) => {
  return text.replace(/\*\*/g, "");
};

export function Game() {
  const navigate = useNavigate();
  const storyContainerRef = useRef(null);
  const { downloadStoryImage } = useStoryCapture();
  const [storySegments, setStorySegments] = useState([]);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChoices, setShowChoices] = useState(true);
  const [error, setError] = useState(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const [loadingMessage, setLoadingMessage] = useState(0);
  const messages = [
    "waking up a sleepy AI...",
    "teaching robots to tell bedtime stories...",
    "bribing pixels to make pretty pictures...",
  ];

  const { isNarratorSpeaking, playNarration, stopNarration } =
    useNarrator(isSoundEnabled);
  const playPageSound = usePageSound(isSoundEnabled);
  const playWritingSound = useWritingSound(isSoundEnabled);
  const {
    sessionId,
    universe,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useGameSession();

  // Sauvegarder l'état du son dans le localStorage
  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, isSoundEnabled);
  }, [isSoundEnabled]);

  // Start the story when session is ready
  useEffect(() => {
    if (sessionId && !isSessionLoading) {
      handleStoryAction("restart");
    }
  }, [sessionId, isSessionLoading]);

  // Add effect for message rotation
  useEffect(() => {
    if (isLoading && storySegments.length === 0) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % messages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading, storySegments.length]);

  const handleBack = () => {
    playPageSound();
    navigate("/tutorial");
  };

  const handleChoice = async (choiceId) => {
    playPageSound();

    setShowChoices(false); // Cacher les choix dès qu'on clique
    // Si c'est l'option "Réessayer", on relance la dernière action
    if (currentChoices.length === 1 && currentChoices[0].text === "Réessayer") {
      // Supprimer le segment d'erreur
      setStorySegments((prev) => prev.slice(0, -1));
      // Réessayer la dernière action
      await handleStoryAction(
        "choice",
        storySegments[storySegments.length - 2]?.choiceId || null
      );
      return;
    }

    // Ajouter le choix comme segment
    const choice = currentChoices.find((c) => c.id === choiceId);
    setStorySegments((prev) => [
      ...prev,
      {
        text: choice.text,
        rawText: stripBoldMarkers(choice.text),
        isChoice: true,
        choiceId: choiceId,
      },
    ]);

    // Continuer l'histoire avec ce choix
    await handleStoryAction("choice", choiceId);
  };

  const handleStoryAction = async (action, choiceId = null) => {
    setIsLoading(true);
    setShowChoices(false);
    setError(null);
    try {
      if (isNarratorSpeaking) {
        stopNarration();
      }

      console.log("Starting story action:", action);
      // Pass sessionId to API calls
      const storyData = await (action === "restart"
        ? storyApi.start(sessionId)
        : storyApi.makeChoice(choiceId, sessionId));

      if (!storyData) {
        throw new Error("Pas de données reçues du serveur");
      }

      // 2. Create new segment without images
      const newSegment = {
        text: formatTextWithBold(storyData.story_text, true),
        rawText: stripBoldMarkers(storyData.story_text), // Store raw text for narration
        isChoice: false,
        isDeath: storyData.is_death,
        isVictory: storyData.is_victory,
        radiationLevel: storyData.radiation_level,
        is_first_step: storyData.is_first_step,
        is_last_step: storyData.is_last_step,
        images: [],
        isLoading: true, // Ajout d'un flag pour indiquer que le segment est en cours de chargement
      };

      playWritingSound();

      // 3. Update segments
      if (action === "restart") {
        setStorySegments([newSegment]);
      } else {
        setStorySegments((prev) => [...prev, newSegment]);
      }

      // 4. Update choices
      setCurrentChoices(storyData.choices || []);

      // 5. Start narration of the new segment
      await playNarration(newSegment.rawText);

      // 6. Generate images in parallel
      if (storyData.image_prompts && storyData.image_prompts.length > 0) {
        console.log(
          "Starting image generation for prompts:",
          storyData.image_prompts
        );
        await generateImagesForStory(
          storyData.image_prompts,
          action === "restart" ? 0 : storySegments.length,
          action === "restart" ? [newSegment] : [...storySegments, newSegment]
        );
      } else {
        // Si pas d'images, marquer le segment comme chargé
        const updatedSegment = { ...newSegment, isLoading: false };
        if (action === "restart") {
          setStorySegments([updatedSegment]);
        } else {
          setStorySegments((prev) => [...prev.slice(0, -1), updatedSegment]);
        }
      }

      // Réafficher les choix une fois tout chargé
      setShowChoices(true);
    } catch (error) {
      console.error("Error in handleStoryAction:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...";

      setError(errorMessage);
      await playNarration(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImagesForStory = async (
    imagePrompts,
    segmentIndex,
    currentSegments
  ) => {
    try {
      let localSegments = [...currentSegments];
      const images = Array(imagePrompts.length).fill(null);
      let allImagesGenerated = false;

      // Déterminer le layout en fonction du nombre d'images
      const layoutType = getNextLayoutType(0, imagePrompts.length);
      console.log(
        `Using layout ${layoutType} for ${imagePrompts.length} images`
      );

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
        console.log(`Panel ${promptIndex} dimensions:`, panelDimensions);

        while (retryCount < maxRetries && !success) {
          try {
            console.log(
              `Generating image ${promptIndex + 1}/${imagePrompts.length}`
            );
            const result = await storyApi.generateImage(
              imagePrompts[promptIndex],
              panelDimensions.width,
              panelDimensions.height
            );

            if (!result) {
              throw new Error("Pas de résultat de génération d'image");
            }

            if (result.success) {
              console.log(`Successfully generated image ${promptIndex + 1}`);
              images[promptIndex] = result.image_base64;

              // Vérifier si toutes les images sont générées
              allImagesGenerated = images.every((img) => img !== null);

              // Ne mettre à jour le segment que si toutes les images sont générées
              if (allImagesGenerated) {
                localSegments[segmentIndex] = {
                  ...localSegments[segmentIndex],
                  images,
                  isLoading: false,
                };
                setStorySegments([...localSegments]);
              }
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
            console.error(`Error generating image ${promptIndex + 1}:`, error);
            retryCount++;
          }
        }

        if (!success) {
          console.error(
            `Failed to generate image ${
              promptIndex + 1
            } after ${maxRetries} attempts`
          );
        }
      }
    } catch (error) {
      console.error("Error in generateImagesForStory:", error);
    }
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
            "Creating a new universe...",
            "Gathering comic book inspiration...",
            "Drawing the first panels...",
            "Setting up the story...",
          ]}
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
        ref={storyContainerRef}
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          />
        )}

        <Tooltip title="Back to tutorial">
          <IconButton
            onClick={handleBack}
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              },
              zIndex: 1000,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        {error ? (
          <ErrorDisplay
            message={error}
            onRetry={() => {
              if (storySegments.length === 0) {
                handleStoryAction("restart");
              } else {
                handleStoryAction(
                  "choice",
                  storySegments[storySegments.length - 1]?.choiceId || null
                );
              }
            }}
          />
        ) : (
          <>
            {isLoading && storySegments.length === 0 ? (
              <LoadingScreen
                icon="story"
                messages={[
                  "Bringing the universe to life...",
                  "Awakening the characters...",
                  "Polishing the first scene...",
                  "Preparing the adventure...",
                  "Adding final touches to the world...",
                ]}
              />
            ) : (
              <>
                <ComicLayout
                  segments={storySegments}
                  choices={showChoices ? currentChoices : []}
                  onChoice={handleChoice}
                  isLoading={isLoading}
                  showScreenshot={storySegments.length > 0}
                  onScreenshot={handleCaptureStory}
                />
                {showChoices && (
                  <StoryChoices
                    choices={currentChoices}
                    onChoice={handleChoice}
                    disabled={isLoading}
                    isLastStep={
                      storySegments.length > 0 &&
                      storySegments[storySegments.length - 1].isLastStep
                    }
                    isGameOver={
                      storySegments.length > 0 &&
                      storySegments[storySegments.length - 1].isGameOver
                    }
                    containerRef={storyContainerRef}
                  />
                )}
              </>
            )}
            <Box
              sx={{
                position: "fixed",
                top: 16,
                right: 16,
                display: "flex",
                gap: 1,
                padding: 1,
                borderRadius: 1,
              }}
            >
              <Tooltip title="Save your story">
                <IconButton
                  id="screenshot-button"
                  onClick={handleCaptureStory}
                  sx={{
                    color: "white",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                    },
                  }}
                >
                  <PhotoCameraOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={isSoundEnabled ? "Couper le son" : "Activer le son"}
              >
                <IconButton
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  sx={{
                    color: "white",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                    },
                  }}
                >
                  {isSoundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
    </motion.div>
  );
}

export default Game;
