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
  const noSessionRoutes = [
    "/api/universe/generate",
    "/api/generate-image",
    "/api/text-to-speech",
  ];

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

// Audio context for narration
let audioContext = null;
let audioSource = null;

// Initialize audio context on user interaction
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Resume the context if it's suspended
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }
  return audioContext;
};

// Story related API calls
export const storyApi = {
  start: async (sessionId) => {
    try {
      const response = await api.post(
        "/api/chat",
        {
          message: "restart",
        },
        {
          headers: getDefaultHeaders(sessionId),
        }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  makeChoice: async (choiceId, sessionId) => {
    try {
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
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Narration related API calls
  playNarration: async (text, sessionId) => {
    try {
      // Stop any existing narration
      if (audioSource) {
        audioSource.stop();
        audioSource = null;
      }

      // Initialize audio context if needed
      audioContext = initAudioContext();

      const response = await api.post(
        "/api/text-to-speech",
        {
          text,
          voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
        },
        {
          headers: getDefaultHeaders(sessionId),
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to generate audio");
      }

      // Convert base64 to audio buffer
      const audioData = atob(response.data.audio_base64);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create and play audio source
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioContext.destination);
      audioSource.start(0);

      // Return a promise that resolves when the audio finishes playing
      return new Promise((resolve) => {
        audioSource.onended = () => {
          audioSource = null;
          resolve();
        };
      });
    } catch (error) {
      console.error("Error playing narration:", error);
      throw error;
    }
  },

  stopNarration: () => {
    if (audioSource) {
      audioSource.stop();
      audioSource = null;
    }
  },

  initAudioContext,
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
  getStyles: async () => {
    try {
      const response = await api.get("/api/universe/styles");
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// Export the base API instance for other uses
export default api;
