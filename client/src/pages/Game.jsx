import { useState, useEffect, useRef } from "react";
import { Box, LinearProgress, IconButton, Tooltip } from "@mui/material";
import { ComicLayout } from "../layouts/ComicLayout";
import { storyApi } from "../utils/api";
import { useNarrator } from "../hooks/useNarrator";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { usePageSound } from "../hooks/usePageSound";
import { useWritingSound } from "../hooks/useWritingSound";
import { StoryChoices } from "../components/StoryChoices";
import { ErrorDisplay } from "../components/ErrorDisplay";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { getNextLayoutType, LAYOUTS } from "../layouts/config";

// Constants
const NARRATION_ENABLED_KEY = "narration_enabled";

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
  const storyContainerRef = useRef(null);
  const { downloadStoryImage } = useStoryCapture();
  const [storySegments, setStorySegments] = useState([]);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChoices, setShowChoices] = useState(true);
  const [error, setError] = useState(null);
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(() => {
    // Initialiser depuis le localStorage avec true comme valeur par défaut
    const stored = localStorage.getItem(NARRATION_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const { isNarratorSpeaking, playNarration, stopNarration } =
    useNarrator(isNarrationEnabled);
  const playPageSound = usePageSound();
  const playWritingSound = useWritingSound();

  // Sauvegarder l'état de la narration dans le localStorage
  useEffect(() => {
    localStorage.setItem(NARRATION_ENABLED_KEY, isNarrationEnabled);
  }, [isNarrationEnabled]);

  // Start the story on first render
  useEffect(() => {
    handleStoryAction("restart");
  }, []);

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
    setError(null); // Reset error state
    try {
      // Stop any ongoing narration
      if (isNarratorSpeaking) {
        stopNarration();
      }

      console.log("Starting story action:", action);
      // 1. Get the story
      const storyData = await (action === "restart"
        ? storyApi.start()
        : storyApi.makeChoice(choiceId));

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
    await downloadStoryImage(
      storyContainerRef,
      `dont-lookup-story-${Date.now()}.png`
    );
  };

  return (
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
          <Box
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              display: "flex",
              gap: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              padding: 1,
              borderRadius: 1,
            }}
          >
            <Tooltip title="Take a screenshot">
              <IconButton
                onClick={handleCaptureStory}
                sx={{
                  color: "white",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                  },
                }}
              >
                <PhotoCameraIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                isNarrationEnabled ? "Disable narration" : "Enable narration"
              }
            >
              <IconButton
                onClick={() => setIsNarrationEnabled(!isNarrationEnabled)}
                sx={{
                  color: "white",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                  },
                }}
              >
                {isNarrationEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
}

export default Game;
