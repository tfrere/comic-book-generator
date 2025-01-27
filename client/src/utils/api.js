import axios from "axios";
import { getDefaultHeaders } from "./session";

// Get API URL from environment or default to localhost in development
const isHFSpace = window.location.hostname.includes("hf.space");
const API_URL = isHFSpace
  ? "" // URL relative pour HF Spaces
  : import.meta.env.VITE_API_URL || "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: getDefaultHeaders(),
  ...(isHFSpace && {
    baseURL: window.location.origin,
  }),
});

// Error handling middleware
const handleApiError = (error) => {
  console.error("API Error:", {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    config: {
      method: error.config?.method,
      url: error.config?.url,
      data: error.config?.data,
    },
  });

  if (error.response) {
    // La requête a été faite et le serveur a répondu avec un code d'erreur
    throw new Error(
      error.response.data?.message ||
        `Erreur ${error.response.status}: ${error.response.statusText}`
    );
  } else if (error.request) {
    // La requête a été faite mais aucune réponse n'a été reçue
    throw new Error("Aucune réponse du serveur");
  } else {
    // Une erreur s'est produite lors de la configuration de la requête
    throw new Error(
      "Une erreur est survenue lors de la configuration de la requête"
    );
  }
};

// Story related API calls
export const storyApi = {
  start: async () => {
    try {
      console.log("Calling start API...");
      const response = await api.post("/api/chat", {
        message: "restart",
      });
      console.log("Start API response:", response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  makeChoice: async (choiceId) => {
    try {
      console.log("Making choice:", choiceId);
      const response = await api.post("/api/chat", {
        message: "choice",
        choice_id: choiceId,
      });
      console.log("Choice API response:", response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  generateImage: async (prompt, width = 512, height = 512) => {
    try {
      console.log("Generating image with prompt:", prompt);
      const response = await api.post("/api/generate-image", {
        prompt,
        width,
        height,
      });
      console.log("Image generation response:", {
        success: response.data.success,
        hasImage: !!response.data.image_base64,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Narration related API calls
  narrate: async (text) => {
    try {
      console.log("Requesting narration for:", text);
      const response = await api.post("/api/text-to-speech", {
        text,
      });
      console.log("Narration response received");
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

// Export the base API instance for other uses
export default api;
