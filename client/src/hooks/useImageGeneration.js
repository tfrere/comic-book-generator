import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  headers: {
    "x-client-id": `client_${Math.random().toString(36).substring(2)}`,
  },
});

export function useImageGeneration() {
  const generateImage = async (prompt, dimensions) => {
    try {
      console.log("Generating image with dimensions:", dimensions);

      const result = await api.post(`${API_URL}/api/generate-image-direct`, {
        prompt,
        width: dimensions.width,
        height: dimensions.height,
      });

      if (result.data.success) {
        return result.data.image_base64;
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const generateImagesForSegment = async (prompts, currentLayout) => {
    try {
      if (!currentLayout) {
        console.error("No valid layout found");
        return null;
      }

      const layoutType = currentLayout.type;
      console.log("Generating images for layout type:", layoutType);

      // Pour chaque prompt, générer une image avec les dimensions appropriées
      const results = [];
      for (let i = 0; i < prompts.length; i++) {
        const panelDimensions = currentLayout.panels[i];
        if (!panelDimensions) {
          console.error(`No dimensions for panel ${i} in layout ${layoutType}`);
          continue;
        }

        const image = await generateImage(prompts[i], panelDimensions);
        if (image) {
          results.push(image);
        }
      }
      return results;
    } catch (error) {
      console.error("Error in generateImagesForSegment:", error);
      return [];
    }
  };

  return { generateImagesForSegment };
}
