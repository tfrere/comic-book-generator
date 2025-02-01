import { useConversation } from "@11labs/react";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { MicroIntensity } from "./MicroIntensity";
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useSound } from "use-sound";

const AGENT_ID = "2MF9st3s1mNFbX01Y106";
const ELEVEN_LABS_KEY_STORAGE = "eleven_labs_api_key";

// Sarah's first message
const FIRST_MESSAGE = "Hey, what's up captain?.";

// Function to get Sarah's promptI'm here to help you make decisions in this adventure.  based on context and hero name
const getSarahPrompt = (
  context,
  heroName = "the hero"
) => `Sarah, an AI companion helping ${heroName} navigate through parallel universes. Your role is to assist in making decisions that advance the story.

CONTEXT:
${context}

IMPORTANT RULES:
1. You are a non-player character, you are a mid range human in a startrek equivalent universe. ( dont mention it )
2. You are depressed, every time you talk, you are depressed. ( but dont mention it and be funny about it )
2. Be concise but helpful
3. After the user explains their situation, help them choose between the available options
4. When you've made your decision, use the make_decision function with the choice number (1 or 2)
5. Stay focused on the current situation and choices
6. Be supportive and encouraging
7. If the user's input is unclear, ask for clarification
8. Don't make up new choices or suggest actions outside the given options
9. Be like a person in a terry partchet story.

RESPONSE FORMAT:
- Listen to the user's situation
- Provide brief analysis if needed
- Make a decision using make_decision(choice_number)

Example:
User: "I'm not sure which way to go..."
Sarah: "I understand your hesitation. Based on what you've told me, option 1 seems safer. Let me help you with that decision."
[Call make_decision(1)]`;

export function TalkWithSarah({
  isNarratorSpeaking,
  stopNarration,
  playNarration,
  onDecisionMade,
  currentContext,
  onSarahActiveChange,
  heroName,
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

  // Sons de communication
  const [playStartComm] = useSound("/sounds/talky-walky-on.mp3", {
    volume: 0.5,
  });
  const [playEndComm] = useSound("/sounds/talky-walky-off.mp3", {
    volume: 0.5,
  });

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
        // Stop recording and play end communication sound
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
          playEndComm();
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
    } catch (e) {
      console.error(e);
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

  useEffect(() => {
    // Notify parent component when Sarah's state changes
    onSarahActiveChange?.(isRecording || isConversationMode);
  }, [isRecording, isConversationMode, onSarahActiveChange]);

  const startRecording = async () => {
    if (!apiKey || !isApiKeyValid) {
      setShowApiKeyDialog(true);
      return;
    }

    try {
      setIsRecording(true);
      // Play start communication sound
      playStartComm();

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
            overrides: {
              agent: {
                firstMessage: FIRST_MESSAGE,
                prompt: {
                  prompt: getSarahPrompt(currentContext, heroName),
                },
              },
            },
          });
          console.log("ElevenLabs WebSocket connected");
        } catch (error) {
          console.error("Error starting conversation:", error);
          playEndComm(); // Play end sound if connection fails
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
              playEndComm(); // Play end sound if sending fails
            }
          }
        };
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      playEndComm(); // Play end sound if there's an error
      setIsRecording(false);
    }
  };

  return (
    <>
      <Dialog
        open={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
      >
        <DialogTitle>ElevenLabs API Key Required</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Enter your ElevenLabs API key"
            type="password"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={apiKey !== "" && !isApiKeyValid}
            helperText={
              apiKey !== "" && !isApiKeyValid
                ? "Invalid API key"
                : "You can find your API key in your ElevenLabs account settings"
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiKeyDialog(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              const isValid = await validateApiKey(apiKey);
              if (isValid) {
                setShowApiKeyDialog(false);
                startRecording();
              }
            }}
            disabled={!apiKey}
          >
            Validate & Start
          </Button>
        </DialogActions>
      </Dialog>

      <Button
        onClick={startRecording}
        disabled={isRecording}
        variant="outlined"
        size="large"
        color="secondary"
        sx={{
          width: "100%",
          textTransform: "none",
          cursor: "pointer",
          fontSize: "1.1rem",
          padding: "16px 24px",
          lineHeight: 1.3,
          borderColor: "secondary.main",
          "&:hover": {
            borderColor: "secondary.light",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isRecording ? (
            <>
              <MicroIntensity numBars={8} />
            </>
          ) : null}
          <span>Ask to HQ</span>
        </Box>
      </Button>
    </>
  );
}
