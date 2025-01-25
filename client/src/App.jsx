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
import {
  getNextPanelDimensions,
  groupSegmentsIntoLayouts,
} from "./layouts/utils";
import { LAYOUTS } from "./layouts/config";

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
  const currentImageRequestRef = useRef(null);
  const pendingImageRequests = useRef(new Set()); // Track pending image requests
  const audioRef = useRef(new Audio());

  // Start the story on first render
  useEffect(() => {
    handleStoryAction("restart");
  }, []); // Empty dependency array for first render only

  const generateImagesForStory = async (
    imagePrompts,
    segmentIndex,
    currentSegments
  ) => {
    try {
      console.log("[generateImagesForStory] Starting with:", {
        promptsCount: imagePrompts.length,
        segmentIndex,
        segmentsCount: currentSegments.length,
      });
      console.log("Image prompts:", imagePrompts);
      console.log("Current segments:", currentSegments);

      let localSegments = [...currentSegments];

      // Traiter chaque prompt un par un
      for (
        let promptIndex = 0;
        promptIndex < imagePrompts.length;
        promptIndex++
      ) {
        // Recalculer le layout actuel pour chaque image
        const layouts = groupSegmentsIntoLayouts(localSegments);
        console.log("[Layout] Current layouts:", layouts);
        const currentLayout = layouts[layouts.length - 1];
        const layoutType = currentLayout?.type || "COVER";
        console.log("[Layout] Current type:", layoutType);

        // Vérifier si nous avons de la place dans le layout actuel
        const currentSegmentImages =
          currentLayout.segments[currentLayout.segments.length - 1].images ||
          [];
        const actualImagesCount = currentSegmentImages.filter(
          (img) => img !== null
        ).length;
        console.log("[Layout] Current segment images:", {
          total: currentSegmentImages.length,
          actual: actualImagesCount,
          hasImages: currentSegmentImages.some((img) => img !== null),
          currentImages: currentSegmentImages.map((img) =>
            img ? "image" : "null"
          ),
        });

        const panelDimensions = LAYOUTS[layoutType].panels[promptIndex];
        console.log(
          "[Layout] Panel dimensions for prompt",
          promptIndex,
          ":",
          panelDimensions
        );

        // Ne créer une nouvelle page que si nous avons encore des prompts à traiter
        // et qu'il n'y a plus de place dans le layout actuel
        if (!panelDimensions && promptIndex < imagePrompts.length - 1) {
          console.log(
            "[Layout] Creating new page - No space in current layout"
          );
          // Créer un nouveau segment pour la nouvelle page
          const newSegment = {
            ...localSegments[segmentIndex],
            images: Array(imagePrompts.length - promptIndex).fill(null),
          };
          localSegments = [...localSegments, newSegment];
          segmentIndex = localSegments.length - 1;
          console.log("[Layout] New segment created:", {
            segmentIndex,
            totalSegments: localSegments.length,
            imagesArray: newSegment.images,
          });
          // Mettre à jour l'état avec le nouveau segment
          setStorySegments(localSegments);
          continue; // Recommencer la boucle avec le nouveau segment
        }

        // Si nous n'avons pas de dimensions de panneau et c'est le dernier prompt,
        // ne pas continuer
        if (!panelDimensions) {
          console.log(
            "[Layout] Stopping - No more space and no more prompts to process"
          );
          break;
        }

        console.log(
          `[Image] Generating image ${promptIndex + 1}/${imagePrompts.length}:`,
          {
            prompt: imagePrompts[promptIndex],
            dimensions: panelDimensions,
          }
        );

        try {
          const result = await api.post(
            `${API_URL}/api/generate-image-direct`,
            {
              prompt: imagePrompts[promptIndex],
              width: panelDimensions.width,
              height: panelDimensions.height,
            }
          );

          console.log(`[Image] Response for image ${promptIndex + 1}:`, {
            success: result.data.success,
            hasImage: !!result.data.image_base64,
            imageLength: result.data.image_base64?.length,
          });

          if (result.data.success) {
            console.log(
              `[Image] Image ${promptIndex + 1} generated successfully`
            );
            // Mettre à jour les segments locaux
            const currentImages = [
              ...(localSegments[segmentIndex].images || []),
            ];
            // Remplacer le null à l'index du prompt par la nouvelle image
            currentImages[promptIndex] = result.data.image_base64;

            localSegments[segmentIndex] = {
              ...localSegments[segmentIndex],
              images: currentImages,
            };
            console.log("[State] Updating segments with new image:", {
              segmentIndex,
              imageIndex: promptIndex,
              imagesArray: currentImages.map((img) => (img ? "image" : "null")),
            });
            // Mettre à jour l'état avec les segments mis à jour
            setStorySegments([...localSegments]);
          } else {
            console.error(
              `[Image] Generation failed for image ${promptIndex + 1}:`,
              result.data.error
            );
          }
        } catch (error) {
          console.error(
            `[Image] Error generating image ${promptIndex + 1}:`,
            error
          );
        }
      }

      console.log(
        "[generateImagesForStory] Completed. Final segments:",
        localSegments.map((seg) => ({
          ...seg,
          images: seg.images?.map((img) => (img ? "image" : "null")),
        }))
      );
      return localSegments[segmentIndex]?.images || [];
    } catch (error) {
      console.error("[generateImagesForStory] Error:", error);
      return [];
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

      // 2. Créer le nouveau segment sans images
      const newSegment = {
        text: formatTextWithBold(response.data.story_text),
        isChoice: false,
        isDeath: response.data.is_death,
        isVictory: response.data.is_victory,
        radiationLevel: response.data.radiation_level,
        is_first_step: response.data.is_first_step,
        is_last_step: response.data.is_last_step,
        images: response.data.image_prompts
          ? Array(response.data.image_prompts.length).fill(null)
          : [], // Pré-remplir avec null pour les spinners
      };

      // 3. Calculer le nouvel index et les segments mis à jour
      let segmentIndex;
      let updatedSegments;

      if (action === "restart") {
        segmentIndex = 0;
        updatedSegments = [newSegment];
      } else {
        // Récupérer l'état actuel de manière synchrone
        segmentIndex = storySegments.length;
        updatedSegments = [...storySegments, newSegment];
      }

      // Mettre à jour l'état avec les nouveaux segments
      setStorySegments(updatedSegments);

      // 4. Mettre à jour les choix immédiatement
      setCurrentChoices(response.data.choices);

      // 5. Désactiver le loading car l'histoire est affichée
      setIsLoading(false);

      // 6. Générer les images en parallèle
      if (
        response.data.image_prompts &&
        response.data.image_prompts.length > 0
      ) {
        try {
          console.log(
            "Starting image generation with prompts:",
            response.data.image_prompts,
            "for segment",
            segmentIndex
          );
          // generateImagesForStory met déjà à jour le state au fur et à mesure
          await generateImagesForStory(
            response.data.image_prompts,
            segmentIndex,
            updatedSegments
          );
        } catch (imageError) {
          console.error("Error generating images:", imageError);
        }
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
        images: [],
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
