import {
  Box,
  Button,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TalkWithSarah } from "./TalkWithSarah";
import { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { storyApi } from "../utils/api";
import { useSoundEffect } from "../hooks/useSoundEffect";
import CloseIcon from "@mui/icons-material/Close";

const { initAudioContext } = storyApi;

// Function to convert text with ** to Chip elements
const formatTextWithBold = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Chip
          key={index}
          label={part.slice(2, -2)}
          size="small"
          sx={{
            mx: 0.5,
            fontSize: "1.1rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            color: "white",
          }}
        />
      );
    }
    return part;
  });
};

export function StoryChoices() {
  const navigate = useNavigate();
  const [isSarahActive, setIsSarahActive] = useState(false);
  const [sarahRecommendation, setSarahRecommendation] = useState(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customChoice, setCustomChoice] = useState("");
  const {
    choices,
    onChoice,
    isLoading,
    isNarratorSpeaking,
    stopNarration,
    playNarration,
    heroName,
    getLastSegment,
    isGameOver,
  } = useGame();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Son de page
  const playPageSound = useSoundEffect({
    basePath: "/sounds/page-flip-",
    numSounds: 7,
    volume: 0.5,
  });

  const lastSegment = getLastSegment();
  const isLastStep = lastSegment?.is_last_step;
  const isDeath = lastSegment?.isDeath;
  const isVictory = lastSegment?.isVictory;
  const storyText = lastSegment?.rawText || "";

  if (isGameOver()) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: isVictory ? "#4CAF50" : "#f44336",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {isVictory ? "VICTORY" : "DEFEAT"}
        </Typography>
      </Box>
    );
  }

  if (!choices || choices.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 0.5,
        width: "100%",
        height: "100%",
      }}
    >
      {isLoading ? (
        <CircularProgress
          size={40}
          sx={{ opacity: "0.2", color: "primary.main" }}
        />
      ) : (
        <>
          {/* {choices
            .filter((_, index) => !isMobile || index === 0)
            .map((choice, index) => (
              <Box
                key={choice.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  minWidth: "fit-content",
                  maxWidth: isMobile ? "90%" : "30%",
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    initAudioContext();
                    playPageSound();
                    stopNarration();
                    onChoice(choice.id);
                  }}
                  disabled={isSarahActive || isLoading || isNarratorSpeaking}
                  sx={{
                    width: "auto",
                    minWidth: "fit-content",
                  }}
                >
                  {formatTextWithBold(choice.text)}
                </Button>
              </Box>
            ))} */}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              minWidth: "fit-content",
              maxWidth: isMobile ? "90%" : "30%",
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                initAudioContext();
                playPageSound();
                stopNarration();
                onChoice(choices[0].id);
              }}
              disabled={isSarahActive || isLoading || isNarratorSpeaking}
              sx={{
                width: "auto",
                minWidth: "fit-content",
              }}
            >
              {formatTextWithBold(choices[0].text)}
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              ml: isMobile ? 0 : 4,
              minWidth: "fit-content",
              maxWidth: "30%",
            }}
          >
            <Button
              variant="contained"
              size="large"
              color="secondary"
              onClick={() => setShowCustomDialog(true)}
              disabled={isSarahActive || isLoading || isNarratorSpeaking}
              sx={{
                width: "auto",
                minWidth: "fit-content",
                textTransform: "none",
              }}
            >
              Write your own path
            </Button>
          </Box>
        </>
      )}

      <Dialog
        open={showCustomDialog}
        onClose={() => setShowCustomDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
        }}
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            backgroundImage: "none",
            boxShadow: "none",
            m: isMobile ? 2 : 3,
            maxHeight: isMobile ? "calc(100% - 32px)" : "calc(100% - 64px)",
          },
        }}
      >
        <DialogTitle
          sx={{
            pt: 2,
            pb: 1,
            textAlign: "left",
            color: "text.primary",
            fontSize: isMobile ? "1.25rem" : "1.5rem",
            pl: 3,
          }}
        >
          What happens next?
        </DialogTitle>
        <IconButton
          onClick={() => setShowCustomDialog(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "text.secondary",
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent
          sx={{
            p: isMobile ? 2 : 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            autoFocus
            multiline
            rows={isMobile ? 5 : 4}
            fullWidth
            variant="outlined"
            placeholder="The hero encounters a dragon..."
            value={customChoice}
            onChange={(e) => setCustomChoice(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                },
                "&.Mui-focused": {
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                },
              },
              "& .MuiOutlinedInput-input": {
                color: "text.primary",
                fontSize: isMobile ? "0.9rem" : "1rem",
                lineHeight: "1.5",
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                if (customChoice.trim()) {
                  initAudioContext();
                  playPageSound();
                  stopNarration();
                  onChoice("custom", customChoice);
                  setShowCustomDialog(false);
                  setCustomChoice("");
                }
              }}
              disabled={!customChoice.trim()}
              variant="contained"
              sx={{
                mt: 1,
                py: 1.5,
                px: 4,
                fontWeight: "bold",
              }}
            >
              Validate
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
