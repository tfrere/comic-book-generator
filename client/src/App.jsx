import { useState, useEffect, useRef } from "react";
import {
  Container,
  Paper,
  Button,
  Box,
  Typography,
  LinearProgress,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";
import { ComicLayout } from "./layouts/ComicLayout";
import { getNextPanelDimensions } from "./layouts/utils";

// Get API URL from environment or default to localhost in development
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Generate a unique client ID
const CLIENT_ID = `client_${Math.random().toString(36).substring(2)}`;

// Create axios instance with default config
const api = axios.create({
  headers: {
    "x-client-id": CLIENT_ID,
  },
});

// Function to convert text with ** to bold elements
const formatTextWithBold = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Remove the ** and wrap in bold
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

function App() {
  const [storySegments, setStorySegments] = useState([]);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const isInitializedRef = useRef(false);
  const currentImageRequestRef = useRef(null);
  const pendingImageRequests = useRef(new Set()); // Track pending image requests

  const generateImageForStory = async (storyText, segmentIndex) => {
    try {
      // Cancel previous request if it exists
      if (currentImageRequestRef.current) {
        currentImageRequestRef.current.abort();
      }

      // Add this segment to pending requests
      pendingImageRequests.current.add(segmentIndex);

      console.log("Generating image for story:", storyText);
      const dimensions = getNextPanelDimensions(storySegments);
      console.log("[DEBUG] Story segments:", storySegments);
      console.log("[DEBUG] Dimensions object:", dimensions);
      console.log(
        "[DEBUG] Width:",
        dimensions?.width,
        "Height:",
        dimensions?.height
      );

      if (!dimensions || !dimensions.width || !dimensions.height) {
        console.error("[ERROR] Invalid dimensions:", dimensions);
        pendingImageRequests.current.delete(segmentIndex);
        return null;
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      currentImageRequestRef.current = abortController;

      const response = await api.post(
        `${API_URL}/api/${isDebugMode ? "test/" : ""}generate-image`,
        {
          prompt: `Comic book style scene: ${storyText}`,
          width: dimensions.width,
          height: dimensions.height,
        },
        {
          signal: abortController.signal,
        }
      );

      // Remove from pending requests
      pendingImageRequests.current.delete(segmentIndex);

      if (response.data.success) {
        return response.data.image_base64;
      }
      return null;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("Image request cancelled for segment", segmentIndex);
        // On met quand même à jour le segment pour arrêter le spinner
        setStorySegments((prev) => {
          const updatedSegments = [...prev];
          if (updatedSegments[segmentIndex]) {
            updatedSegments[segmentIndex] = {
              ...updatedSegments[segmentIndex],
              image_base64: null,
              imageRequestCancelled: true, // Flag pour indiquer que la requête a été annulée
            };
          }
          return updatedSegments;
        });
      } else {
        console.error("Error generating image:", error);
      }
      pendingImageRequests.current.delete(segmentIndex);
      return null;
    }
  };

  const handleStoryAction = async (action, choiceId = null) => {
    setIsLoading(true);
    try {
      // 1. D'abord, obtenir l'histoire
      const response = await api.post(
        `${API_URL}/api/${isDebugMode ? "test/" : ""}chat`,
        {
          message: action,
          choice_id: choiceId,
        }
      );

      // 2. Créer le nouveau segment sans image
      const newSegment = {
        text: formatTextWithBold(response.data.story_text),
        isChoice: false,
        isDeath: response.data.is_death,
        isVictory: response.data.is_victory,
        radiationLevel: response.data.radiation_level,
        is_first_step: response.data.is_first_step,
        is_last_step: response.data.is_last_step,
        image_base64: null,
      };

      let segmentIndex;
      // 3. Mettre à jour l'état avec le nouveau segment
      if (action === "restart") {
        setStorySegments([newSegment]);
        segmentIndex = 0;
      } else {
        setStorySegments((prev) => {
          segmentIndex = prev.length;
          return [...prev, newSegment];
        });
      }

      // 4. Mettre à jour les choix immédiatement
      setCurrentChoices(response.data.choices);

      // 5. Désactiver le loading car l'histoire est affichée
      setIsLoading(false);

      // 6. Tenter de générer l'image en arrière-plan
      try {
        const image_base64 = await generateImageForStory(
          response.data.story_text,
          segmentIndex
        );
        if (image_base64) {
          setStorySegments((prev) => {
            const updatedSegments = [...prev];
            if (updatedSegments[segmentIndex]) {
              updatedSegments[segmentIndex] = {
                ...updatedSegments[segmentIndex],
                image_base64: image_base64,
              };
            }
            return updatedSegments;
          });
        }
      } catch (imageError) {
        console.error("Error generating image:", imageError);
      }
    } catch (error) {
      console.error("Error:", error);
      // En cas d'erreur, créer un segment d'erreur qui permet de continuer
      const errorSegment = {
        text: "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...",
        isChoice: false,
        isDeath: false,
        isVictory: false,
        radiationLevel:
          storySegments.length > 0
            ? storySegments[storySegments.length - 1].radiationLevel
            : 0,
        image_base64: null,
      };

      // Ajouter le segment d'erreur et permettre de réessayer
      if (action === "restart") {
        setStorySegments([errorSegment]);
      } else {
        setStorySegments((prev) => [...prev, errorSegment]);
      }

      // Donner l'option de réessayer
      setCurrentChoices([{ id: 1, text: "Réessayer" }]);

      setIsLoading(false);
    }
  };

  // Start the story when the component mounts
  useEffect(() => {
    if (!isInitializedRef.current) {
      handleStoryAction("restart");
      isInitializedRef.current = true;
    }
  }, []); // Empty dependency array since we're using a ref

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

    // Comportement normal pour les autres choix
    const choice = currentChoices.find((c) => c.id === choiceId);
    setStorySegments((prev) => [
      ...prev,
      {
        text: choice.text,
        isChoice: true,
        choiceId: choiceId, // Stocker l'ID du choix pour pouvoir réessayer
      },
    ]);

    // Continue the story with this choice
    await handleStoryAction("choice", choiceId);
  };

  // Filter out choice segments
  const nonChoiceSegments = storySegments.filter(
    (segment) => !segment.isChoice
  );

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "warning.main",
              color: "white",
              px: 2,
              py: 1,
              borderRadius: 1,
              "& .radiation-value": {
                color:
                  storySegments.length > 0 &&
                  storySegments[storySegments.length - 1].radiationLevel >= 7
                    ? "error.light"
                    : "inherit",
              },
            }}
          >
            <Typography variant="body1" component="span">
              Radiation:{" "}
              <span className="radiation-value">
                {storySegments.length > 0
                  ? `${
                      storySegments[storySegments.length - 1].radiationLevel
                    }/10`
                  : "0/10"}
              </span>
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={() => handleStoryAction("restart")}
            disabled={isLoading}
          >
            Restart
          </Button>
          <Button
            variant={isDebugMode ? "contained" : "outlined"}
            color={isDebugMode ? "secondary" : "primary"}
            onClick={() => {
              setIsDebugMode(!isDebugMode);
              // Redémarrer l'histoire en mode debug
              if (!isDebugMode) {
                handleStoryAction("restart");
              }
            }}
            sx={{ ml: 2 }}
          >
            {isDebugMode ? "Mode Debug" : "Mode Normal"}
          </Button>
        </Box>
      </Box> */}

      {/* {isLoading && <LinearProgress sx={{ mb: 2 }} />} */}

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          gap: 4,
          p: 2,
          width: "100%",
          height: "90vh",
        }}
      >
        <ComicLayout segments={nonChoiceSegments} />
      </Box>

      <Box
        sx={{
          py: 3,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        {currentChoices.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              minHeight: "40px",
            }}
          >
            {currentChoices.map((choice) => (
              <Button
                key={choice.id}
                variant="contained"
                size="large"
                onClick={() => handleChoice(choice.id)}
                disabled={isLoading}
                sx={{ minWidth: "200px" }}
              >
                {formatTextWithBold(choice.text)}
              </Button>
            ))}
          </Box>
        ) : storySegments.length > 0 &&
          storySegments[storySegments.length - 1].is_last_step ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              minHeight: "40px",
            }}
          >
            <Button
              variant="text"
              size="large"
              onClick={() => handleStoryAction("restart")}
              startIcon={<RestartAltIcon />}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "text.primary",
                },
              }}
            >
              Replay
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export default App;
