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
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TalkWithSarah } from "./TalkWithSarah";
import { useState } from "react";
import { useGame } from "../contexts/GameContext";
import { storyApi } from "../utils/api";
import { useSoundEffect } from "../hooks/useSoundEffect";
import CloseIcon from "@mui/icons-material/Close";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";

const { initAudioContext } = storyApi;

// Phrases aléatoires WTF pour le placeholder
const RANDOM_PLACEHOLDERS = [
  "A dragon appears right above the hero...",
  "Suddenly, all the trees start dancing the macarena...",
  "A time-traveling pizza delivery guy shows up with a mysterious package...",
  "The ground turns into jello and starts wobbling menacingly...",
  "A choir of singing cats descends from the sky...",
  "The hero's shadow detaches itself and starts doing stand-up comedy...",
  "All the nearby rocks transform into vintage toasters...",
  "A portal opens, and out steps the hero's evil twin made entirely of cheese...",
  "The moon starts beatboxing an ominous rhythm...",
  "Every nearby plant suddenly develops a British accent and starts having tea...",
  "A giant rubber duck floats down from the sky...",
  "The hero's sword turns into a bouquet of flowers...",
  "A mysterious fog rolls in, bringing with it the scent of fresh cookies...",
  "The hero's shoes start tap dancing on their own...",
  "A unicorn gallops by, leaving a trail of glitter...",
  "The sky turns neon green and starts flashing like a disco...",
  "A talking squirrel offers the hero some sage advice...",
  "The hero's reflection in the water winks and waves...",
  "A giant marshmallow bounces across the landscape...",
  "The hero's cape transforms into a pair of wings...",
  "A parade of tiny elephants marches through the scene...",
  "The sun suddenly dons sunglasses and starts singing...",
  "A mysterious door appears, leading to a candy world...",
  "The hero's hat turns into a magical top hat...",
  "A rainbow-colored river flows uphill...",
  "The hero's backpack starts floating and glowing...",
  "A group of fairies begins to dance around the hero...",
  "The hero's footsteps echo with musical notes...",
  "A giant book opens, revealing a new adventure...",
  "The hero's pet dragon starts juggling fireballs...",
  "A spaceship lands and out steps an alien with a top hat...",
  "The hero's backpack starts singing show tunes...",
  "A rainbow appears and a leprechaun slides down it...",
  "The hero's pet suddenly starts speaking in riddles...",
  "A gust of wind brings a shower of confetti...",
  "The hero's map transforms into a treasure map...",
  "A giant clock appears, ticking backwards...",
  "The hero's footsteps leave a trail of glowing footprints...",
  "A parade of penguins marches by, playing instruments...",
  "The hero's hat flies off and starts floating in mid-air...",
  "A mysterious voice narrates the hero's every move...",
  "The hero's shadow starts mimicking their actions in exaggerated ways...",
  "A pikachu appears, looking curious...",
  "A bublizarre jumps out from the bushes...",
  "A pikachu flies by, leaving a trail of sparkles...",
  "A salameche suddenly joins the hero's journey...",
  "A carapuce watches from a distance, intrigued...",
];

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
  const [lastUsedPlaceholder, setLastUsedPlaceholder] = useState("");
  const [currentPlaceholder] = useState(() => {
    const randomPlaceholder =
      RANDOM_PLACEHOLDERS[
        Math.floor(Math.random() * RANDOM_PLACEHOLDERS.length)
      ];
    setLastUsedPlaceholder(randomPlaceholder);
    return randomPlaceholder;
  });
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

  // Son de dé
  const playDiceSound = useSoundEffect({
    basePath: "/sounds/dice-",
    numSounds: 3,
    volume: 0.1,
    enabled: true,
  });

  const lastSegment = getLastSegment();
  const isLastStep = lastSegment?.is_last_step;
  const isDeath = lastSegment?.isDeath;
  const isVictory = lastSegment?.isVictory;
  const storyText = lastSegment?.rawText || "";

  const getRandomPlaceholder = () => {
    // Filter out the last used placeholder
    const availablePlaceholders = RANDOM_PLACEHOLDERS.filter(
      (p) => p !== lastUsedPlaceholder
    );
    // Get a random placeholder from the filtered list
    const newPlaceholder =
      availablePlaceholders[
        Math.floor(Math.random() * availablePlaceholders.length)
      ];
    // Update the last used placeholder
    setLastUsedPlaceholder(newPlaceholder);
    return newPlaceholder;
  };

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
      data-story-choices
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

          <Typography
            variant="h6"
            sx={{
              display: { xs: "none", sm: "block" },
              color: "rgba(255,255,255,0.5)",
              fontWeight: "bold",
              fontSize: "1.2rem",
              mx: 2,
            }}
          >
            OR
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              // ml: isMobile ? 0 : 4,
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
              Write your own choice...
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
            placeholder={currentPlaceholder}
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
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}
          >
            <Button
              onClick={() => {
                const randomChoice = getRandomPlaceholder();
                setCustomChoice(randomChoice.slice(0, -3));
                playDiceSound();
              }}
              variant="outlined"
              sx={{
                minWidth: "48px",
                width: "48px",
                height: "48px",
                p: 0,
                borderColor: "rgba(255, 255, 255, 0.23)",
                color: "white",
                "&:hover": {
                  borderColor: "white",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                },
              }}
            >
              <CasinoOutlinedIcon />
            </Button>
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
