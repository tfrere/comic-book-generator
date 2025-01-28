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
  ...(isHFSpace && {
    baseURL: window.location.origin,
  }),
});

// Add request interceptor to handle headers
api.interceptors.request.use((config) => {
  // Routes qui ne nécessitent pas de session_id
  const noSessionRoutes = ["/api/universe/generate", "/api/generate-image"];

  if (noSessionRoutes.includes(config.url)) {
    return config;
  }

  // Pour toutes les autres requêtes, s'assurer qu'on a un session_id
  if (!config.headers["x-session-id"]) {
    throw new Error("Session ID is required for this request");
  }

  return config;
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
  start: async (sessionId) => {
    try {
      console.log("Calling start API with session:", sessionId);
      const response = await api.post(
        "/api/chat",
        {
          message: "restart",
        },
        {
          headers: getDefaultHeaders(sessionId),
        }
      );
      console.log("Start API response:", response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  makeChoice: async (choiceId, sessionId) => {
    try {
      console.log("Making choice:", choiceId, "for session:", sessionId);
      const response = await api.post(
        "/api/chat",
        {
          message: "choice",
          choice_id: choiceId,
        },
        {
          headers: getDefaultHeaders(sessionId),
        }
      );
      console.log("Choice API response:", response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  generateImage: async (
    prompt,
    width = 512,
    height = 512,
    sessionId = null
  ) => {
    try {
      console.log("Generating image with prompt:", prompt);
      const config = {
        prompt,
        width,
        height,
      };

      const options = {};
      if (sessionId) {
        options.headers = getDefaultHeaders(sessionId);
      }

      const response = await api.post("/api/generate-image", config, options);
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
  narrate: async (text, sessionId) => {
    try {
      console.log("Requesting narration for:", text);
      const response = await api.post(
        "/api/text-to-speech",
        {
          text,
        },
        {
          headers: getDefaultHeaders(sessionId),
        }
      );
      console.log("Narration response received");
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export const universeApi = {
  generate: async () => {
    try {
      const response = await api.post("/api/universe/generate");
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// Export the base API instance for other uses
export default api;
