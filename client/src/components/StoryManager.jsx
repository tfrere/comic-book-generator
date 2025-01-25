import { useEffect } from "react";
import { useComic } from "../context/ComicContext";
import { useImageGeneration } from "../hooks/useImageGeneration";
import { groupSegmentsIntoLayouts } from "../layouts/utils";
import { LAYOUTS } from "../layouts/config";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  headers: {
    "x-client-id": `client_${Math.random().toString(36).substring(2)}`,
  },
});

// Function to convert text with ** to bold elements
const formatTextWithBold = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export function StoryManager() {
  const { state, updateSegments, updateSegment, setChoices, setLoading } =
    useComic();
  const { generateImagesForSegment } = useImageGeneration();

  const handleStoryAction = async (action, choiceId = null) => {
    setLoading(true);
    try {
      // 1. Obtenir l'histoire
      const response = await api.post(`${API_URL}/api/chat`, {
        message: action,
        choice_id: choiceId,
      });

      // 2. Créer le nouveau segment
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
          : [],
      };

      // 3. Mettre à jour les segments
      const segmentIndex = action === "restart" ? 0 : state.segments.length;
      const updatedSegments =
        action === "restart" ? [newSegment] : [...state.segments, newSegment];

      updateSegments(updatedSegments);

      // 4. Mettre à jour les choix
      setChoices(response.data.choices);
      setLoading(false);

      // 5. Générer les images si nécessaire
      if (response.data.image_prompts?.length > 0) {
        const prompts = response.data.image_prompts;
        let currentPromptIndex = 0;
        let currentSegmentIndex = segmentIndex;

        while (currentPromptIndex < prompts.length) {
          // Recalculer les layouts avec les segments actuels
          const layouts = groupSegmentsIntoLayouts(updatedSegments);
          let currentLayout = layouts[layouts.length - 1];

          // Pour un layout COVER, ne prendre que le premier prompt
          if (currentLayout.type === "COVER") {
            const promptsToUse = [prompts[0]];
            console.log("COVER layout: using only first prompt");

            const images = await generateImagesForSegment(
              promptsToUse,
              currentLayout
            );

            if (images && images.length > 0) {
              const currentSegment = updatedSegments[currentSegmentIndex];
              const updatedSegment = {
                ...currentSegment,
                images: [images[0]], // Ne garder que la première image
              };
              updatedSegments[currentSegmentIndex] = updatedSegment;
              updateSegments(updatedSegments);
            }
            break; // Sortir de la boucle car nous n'avons besoin que d'une image
          }

          // Pour les autres layouts, continuer normalement
          const remainingPanels =
            LAYOUTS[currentLayout.type].panels.length -
            (currentLayout.segments[currentLayout.segments.length - 1].images
              ?.length || 0);

          if (remainingPanels === 0) {
            // Créer un nouveau segment pour la nouvelle page
            const newPageSegment = {
              ...newSegment,
              images: Array(prompts.length - currentPromptIndex).fill(null),
            };
            updatedSegments.push(newPageSegment);
            currentSegmentIndex = updatedSegments.length - 1;
            updateSegments(updatedSegments);
            continue;
          }

          // Générer les images pour ce layout
          const promptsForCurrentLayout = prompts.slice(
            currentPromptIndex,
            currentPromptIndex + remainingPanels
          );

          console.log("Generating images for layout:", {
            segmentIndex: currentSegmentIndex,
            layoutType: currentLayout.type,
            prompts: promptsForCurrentLayout,
            remainingPanels,
          });

          // Générer les images
          const images = await generateImagesForSegment(
            promptsForCurrentLayout,
            currentLayout
          );

          // Mettre à jour le segment avec les nouvelles images
          if (images && images.length > 0) {
            const currentSegment = updatedSegments[currentSegmentIndex];
            const updatedSegment = {
              ...currentSegment,
              images: [...(currentSegment.images || []), ...images],
            };
            updatedSegments[currentSegmentIndex] = updatedSegment;
            updateSegments(updatedSegments);
          }

          currentPromptIndex += promptsForCurrentLayout.length;
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorSegment = {
        text: "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...",
        isChoice: false,
        isDeath: false,
        isVictory: false,
        radiationLevel:
          state.segments.length > 0
            ? state.segments[state.segments.length - 1].radiationLevel
            : 0,
        images: [],
      };

      updateSegments(
        action === "restart"
          ? [errorSegment]
          : [...state.segments, errorSegment]
      );
      setChoices([{ id: 1, text: "Réessayer" }]);
      setLoading(false);
    }
  };

  // Démarrer l'histoire au montage
  useEffect(() => {
    handleStoryAction("restart");
  }, []);

  return null; // Ce composant ne rend rien, il gère juste la logique
}
