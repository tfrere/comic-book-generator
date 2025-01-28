import { useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useConversation } from "@11labs/react";

const AGENT_ID = "2MF9st3s1mNFbX01Y106";
const ELEVEN_LABS_KEY_STORAGE = "eleven_labs_api_key";

export function TalkWithSarah({
  isNarratorSpeaking,
  stopNarration,
  playNarration,
  onDecisionMade,
  currentContext,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(ELEVEN_LABS_KEY_STORAGE) || "";
  });
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wsRef = useRef(null);

  const conversation = useConversation({
    agentId: AGENT_ID,
    headers: {
      "xi-api-key": apiKey,
    },
    onResponse: async (response) => {
      if (response.type === "audio") {
        try {
          const audioBlob = new Blob([response.audio], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          await playNarration(audioUrl);
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.error("Error playing ElevenLabs audio:", error);
        }
      }
    },
    clientTools: {
      make_decision: async ({ decision }) => {
        console.log("AI made decision:", decision);
        // Stop recording
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
        setIsConversationMode(false);
        await conversation?.endSession();
        setIsRecording(false);
        await onDecisionMade(parseInt(decision));
      },
    },
  });

  // Valider la clé API
  const validateApiKey = async (key) => {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: {
          "xi-api-key": key,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Vérifier la validité de la clé API quand elle change
  useEffect(() => {
    const checkApiKey = async () => {
      if (apiKey) {
        const isValid = await validateApiKey(apiKey);
        setIsApiKeyValid(isValid);
        if (isValid) {
          localStorage.setItem(ELEVEN_LABS_KEY_STORAGE, apiKey);
        }
      } else {
        setIsApiKeyValid(false);
      }
    };
    checkApiKey();
  }, [apiKey]);

  // Sauvegarder la clé API dans le localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(ELEVEN_LABS_KEY_STORAGE, apiKey);
    }
  }, [apiKey]);

  const startRecording = async () => {
    if (!apiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    try {
      setIsRecording(true);
      // Stop narration audio if it's playing
      if (isNarratorSpeaking) {
        stopNarration();
      }

      // Safely stop any conversation audio if playing
      if (conversation?.audioRef?.current) {
        conversation.audioRef.current.pause();
        conversation.audioRef.current.currentTime = 0;
      }

      if (!isConversationMode) {
        setIsConversationMode(true);
        try {
          if (!conversation) {
            throw new Error("Conversation not initialized");
          }
          await conversation.startSession({
            agentId: AGENT_ID,
            initialContext: currentContext,
          });
          console.log("ElevenLabs WebSocket connected");
        } catch (error) {
          console.error("Error starting conversation:", error);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        audioChunksRef.current = [];

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        reader.onload = async () => {
          const base64Audio = reader.result.split(",")[1];
          if (isConversationMode) {
            try {
              // Send audio to ElevenLabs conversation
              await conversation.send({
                type: "audio",
                data: base64Audio,
              });
            } catch (error) {
              console.error("Error sending audio to ElevenLabs:", error);
            }
          }
        };
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const handleSaveApiKey = () => {
    setShowApiKeyDialog(false);
    if (apiKey) {
      startRecording();
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
        <TextField
          size="small"
          type="password"
          placeholder="Enter your ElevenLabs API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          sx={{
            width: "300px",
            "& .MuiOutlinedInput-root": {
              color: "white",
              "& fieldset": {
                borderColor: "rgba(255, 255, 255, 0.23)",
              },
              "&:hover fieldset": {
                borderColor: "white",
              },
              "&.Mui-focused fieldset": {
                borderColor: "white",
              },
              "& .MuiOutlinedInput-input": {
                paddingRight: apiKey ? "40px" : "14px", // Padding dynamique
              },
            },
            "& .MuiInputBase-input": {
              color: "white",
              "&::placeholder": {
                color: "rgba(255, 255, 255, 0.5)",
                opacity: 1,
              },
            },
          }}
        />
        {apiKey && (
          <Tooltip
            title={isApiKeyValid ? "API key is valid" : "Invalid API key"}
          >
            <Box
              sx={{
                position: "absolute",
                right: 10,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                borderRadius: "50%",
                padding: "2px",
              }}
            >
              {isApiKeyValid ? (
                <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 20 }} />
              ) : (
                <CancelIcon sx={{ color: "#f44336", fontSize: 20 }} />
              )}
            </Box>
          </Tooltip>
        )}
      </Box>
      <IconButton
        onClick={startRecording}
        disabled={isRecording || !isApiKeyValid}
        sx={{
          color: "white",
          backgroundColor: isRecording ? "primary.main" : "transparent",
          "&:hover": {
            backgroundColor: isRecording
              ? "primary.dark"
              : "rgba(0, 0, 0, 0.7)",
          },
          px: 2,
          borderRadius: 2,
          border: "1px solid white",
          opacity: !isApiKeyValid ? 0.5 : 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isRecording ? <FiberManualRecordIcon sx={{ color: "red" }} /> : null}
          <span style={{ fontSize: "1rem" }}>Talk with Sarah</span>
        </Box>
      </IconButton>
    </Box>
  );
}
