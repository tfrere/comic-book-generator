import { useState, useEffect, useRef } from "react";
import { Box, LinearProgress, IconButton, Tooltip } from "@mui/material";
import { ComicLayout } from "../layouts/ComicLayout";
import { storyApi } from "../utils/api";
import { useNarrator } from "../hooks/useNarrator";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { StoryChoices } from "../components/StoryChoices";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

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
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(() => {
    // Initialiser depuis le localStorage avec true comme valeur par défaut
    const stored = localStorage.getItem(NARRATION_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });
  const { isNarratorSpeaking, playNarration, stopNarration } =
    useNarrator(isNarrationEnabled);

  // Sauvegarder l'état de la narration dans le localStorage
  useEffect(() => {
    localStorage.setItem(NARRATION_ENABLED_KEY, isNarrationEnabled);
  }, [isNarrationEnabled]);

  // Start the story on first render
  useEffect(() => {
    handleStoryAction("restart");
  }, []);

  const handleChoice = async (choiceId) => {
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
        generateImagesForStory(
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
    } catch (error) {
      console.error("Error in handleStoryAction:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...";

      const errorSegment = {
        text: errorMessage,
        rawText: errorMessage,
        isChoice: false,
        isDeath: false,
        isVictory: false,
        radiationLevel:
          storySegments.length > 0
            ? storySegments[storySegments.length - 1].radiationLevel
            : 0,
        images: [],
        isLoading: false,
      };

      if (action === "restart") {
        setStorySegments([errorSegment]);
      } else {
        // En cas d'erreur sur un choix, on garde le segment précédent
        setStorySegments((prev) => [...prev.slice(0, -1), errorSegment]);
      }

      // Set retry choice
      setCurrentChoices([{ id: "retry", text: "Réessayer" }]);

      // Play error message
      await playNarration(errorSegment.rawText);
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

      for (
        let promptIndex = 0;
        promptIndex < imagePrompts.length;
        promptIndex++
      ) {
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            console.log(
              `Generating image ${promptIndex + 1}/${imagePrompts.length}`
            );
            const result = await storyApi.generateImage(
              imagePrompts[promptIndex]
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

  // Filter out choice segments for display
  const nonChoiceSegments = storySegments.filter(
    (segment) => !segment.isChoice
  );

  const handleCaptureStory = async () => {
    await downloadStoryImage(
      storyContainerRef,
      `dont-lookup-story-${Date.now()}.png`
    );
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#121212",
        }}
      >
        {/* Narration control - always visible in top right */}
        <Box
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Tooltip
            title={
              isNarrationEnabled
                ? "Désactiver la narration"
                : "Activer la narration"
            }
          >
            <IconButton
              onClick={() => setIsNarrationEnabled(!isNarrationEnabled)}
              sx={{
                backgroundColor: isNarrationEnabled
                  ? "primary.main"
                  : "rgba(255, 255, 255, 0.1)",
                color: "white",
                "&:hover": {
                  backgroundColor: isNarrationEnabled
                    ? "primary.dark"
                    : "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              {isNarrationEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Progress bar */}
        {isLoading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1,
            }}
          />
        )}

        {/* Comic layout */}
        <Box
          ref={storyContainerRef}
          sx={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            p: 4,
          }}
        >
          <ComicLayout
            segments={storySegments}
            choices={currentChoices}
            onChoice={handleChoice}
            isLoading={isLoading || isNarratorSpeaking}
            showScreenshot={
              currentChoices.length === 1 &&
              currentChoices[0].text === "Réessayer"
            }
            onScreenshot={() => downloadStoryImage(storyContainerRef)}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default Game;
