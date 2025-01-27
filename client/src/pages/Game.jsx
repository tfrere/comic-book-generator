import { useConversation } from '@11labs/react';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Box, CircularProgress, IconButton, LinearProgress, TextField, Tooltip } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useNarrator } from '../hooks/useNarrator';
import { useStoryCapture } from '../hooks/useStoryCapture';
import { ComicLayout } from '../layouts/ComicLayout';
import { storyApi } from '../utils/api';
import { CLIENT_ID } from '../utils/session';

// Constants
const NARRATION_ENABLED_KEY = "narration_enabled";

const AGENT_ID = "2MF9st3s1mNFbX01Y106";

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
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [xiApiKey, setXiApiKey] = useState(() => {
    return import.meta.env.VITE_XI_API_KEY || localStorage.getItem('xiApiKey') || '';
  });
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState(null); // null, 'success', 'error'
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wsRef = useRef(null);

  const [isNarrationEnabled, setIsNarrationEnabled] = useState(() => {
    const stored = localStorage.getItem(NARRATION_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  });

  const { isNarratorSpeaking, playNarration, stopNarration } =
    useNarrator(isNarrationEnabled);

  const conversation = useConversation({
    agentId: AGENT_ID,
    headers: {
      'xi-api-key': xiApiKey
    },
    onResponse: async (response) => {
      if (response.type === "audio") {
        const audioBlob = new Blob([response.audio], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        playNarration(audioUrl);
      }
    },
    clientTools: {
      make_decision: async ({ decision }) => {
        console.log("AI made decision:", decision);
        await conversation?.endSession();
        setIsRecording(false);
        await handleChoice(parseInt(decision));
      },
    },
  });

  const { isSpeaking } = conversation || {};

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (xiApiKey && xiApiKey !== import.meta.env.VITE_XI_API_KEY) {
      localStorage.setItem('xiApiKey', xiApiKey);
    }
  }, [xiApiKey]);

  // Sauvegarder l'état de la narration dans le localStorage
  useEffect(() => {
    localStorage.setItem(NARRATION_ENABLED_KEY, isNarrationEnabled);
  }, [isNarrationEnabled]);

  // Start the story on first render
  useEffect(() => {
    handleStoryAction("restart");
  }, []);

  // Audio recording setup
  const startRecording = async () => {
    try {
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
            initialContext: `This is the current situation : ${
              storySegments[storySegments.length - 1].text
            }. Those are the possible actions, ${currentChoices
              .map((choice, index) => `decision ${index + 1} : ${choice.text}`)
              .join(", ")}.`,
          });
          console.log("ElevenLabs WebSocket connected");
        } catch (error) {
          console.error("Error initializing ElevenLabs conversation:", error);
          setIsConversationMode(false);
          return;
        }
      } else if (isSpeaking && conversation) {
        await conversation.endSession();
        const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;
        await conversation.startSession({ url: wsUrl });
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
        const reader = new FileReader();

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
          } else {
            // Otherwise use the original WebSocket connection
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              console.log("Sending audio to server via WebSocket");
              wsRef.current.send(
                JSON.stringify({
                  type: "audio_input",
                  audio: base64Audio,
                  client_id: CLIENT_ID,
                })
              );
            }
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
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
      const errorSegment = {
        text:
          error.message ||
          "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...",
        rawText:
          error.message ||
          "Le conteur d'histoires est temporairement indisponible. Veuillez réessayer dans quelques instants...",
        isChoice: false,
        isDeath: false,
        isVictory: false,
        radiationLevel:
          storySegments.length > 0
            ? storySegments[storySegments.length - 1].radiationLevel
            : 0,
        images: [],
      };

      if (action === "restart") {
        setStorySegments([errorSegment]);
      } else {
        setStorySegments((prev) => [...prev, errorSegment]);
      }

      // Set retry choice
      setCurrentChoices([{ id: 1, text: "Réessayer" }]);

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

  const validateApiKey = async () => {
    setIsValidatingKey(true);
    setKeyValidationStatus(null);
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': xiApiKey
        }
      });
      if (response.ok) {
        setKeyValidationStatus('success');
        localStorage.setItem('xiApiKey', xiApiKey);
      } else {
        setKeyValidationStatus('error');
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      setKeyValidationStatus('error');
    } finally {
      setIsValidatingKey(false);
    }
  };

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
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              type="password"
              label="ElevenLabs API Key"
              value={xiApiKey}
              onChange={(e) => {
                setXiApiKey(e.target.value);
                setKeyValidationStatus(null);
              }}
              error={keyValidationStatus === 'error'}
              helperText={keyValidationStatus === 'error' ? 'Invalid API key' : ''}
              sx={{
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
                '& .MuiFormHelperText-root': {
                  color: 'error.main',
                },
              }}
              placeholder="Enter your xi-api-key"
            />
            <IconButton
              onClick={validateApiKey}
              disabled={!xiApiKey || isValidatingKey}
              sx={{
                backgroundColor: keyValidationStatus === 'success' 
                  ? 'success.main' 
                  : keyValidationStatus === 'error'
                  ? 'error.main'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '&:hover': {
                  backgroundColor: keyValidationStatus === 'success'
                    ? 'success.dark'
                    : keyValidationStatus === 'error'
                    ? 'error.dark'
                    : 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              {isValidatingKey ? (
                <CircularProgress size={24} color="inherit" />
              ) : keyValidationStatus === 'success' ? (
                <CheckIcon />
              ) : keyValidationStatus === 'error' ? (
                <CloseIcon />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </Box>
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
          <Tooltip title={isRecording ? "Stop" : "Start talking to Sarah"}>
            <Box
              onClick={isRecording ? () => {
                setIsRecording(false);
                mediaRecorderRef.current?.stop();
              } : startRecording}
              sx={{
                cursor: 'pointer',
                backgroundColor: isRecording ? 'error.main' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  backgroundColor: isRecording ? 'error.dark' : 'rgba(255, 255, 255, 0.2)',
                }
              }}
            >
              {isRecording ? "Stop" : "Try to convince Sarah"}
            </Box>
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
