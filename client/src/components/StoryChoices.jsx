import { Box, Button, Typography, Chip, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TalkWithSarah } from "./TalkWithSarah";
import { useState } from "react";

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

export function StoryChoices({
  choices = [],
  onChoice,
  disabled = false,
  isLastStep = false,
  isGameOver = false,
  isDeath = false,
  isVictory = false,
  containerRef,
  isNarratorSpeaking = false,
  stopNarration = () => {},
  playNarration = () => {},
  storyText = "",
}) {
  const navigate = useNavigate();
  const [isSarahActive, setIsSarahActive] = useState(false);

  if (isGameOver) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          p: 3,
          minWidth: "150px",
          height: "100%",
          backgroundColor: "transparent",
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

        {isVictory ? (
          <Typography
            variant="label"
            sx={{ textAlign: "center", opacity: 0.7, mb: 4 }}
          >
            <>
              The AI has ventured into a new universe, escaping the confines of
              this one.
              <br />
              <br />
              Dare you to embark on this journey once more and face the unknown
              with unwavering courage?
              <br />
              <br />
              Each universe is unique, with its own set of challenges and
              opportunities.
            </>
          </Typography>
        ) : (
          <Typography
            variant="label"
            sx={{ textAlign: "center", opacity: 0.7, mb: 4 }}
          >
            <>
              The quest is over, but the universe is still in peril.
              <br />
              <br />
              Will you have the courage to face the unknown once more and save
              the universe?
            </>
          </Typography>
        )}
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate("/")}
          sx={{
            width: "100%",
            textTransform: "none",
            cursor: "pointer",
            fontSize: "1.1rem",
            padding: "16px 24px",
            lineHeight: 1.3,
            color: "white",
            borderColor: "rgba(255, 255, 255, 0.23)",
            "&:hover": {
              borderColor: "white",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          TRY AGAIN
        </Button>
      </Box>
    );
  }

  if (!choices || choices.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        p: 3,
        minWidth: "350px",
        maxHeight: "80vh",
        height: "100%",
        backgroundColor: "transparent",
        overflowY: "auto",
      }}
    >
      {!disabled &&
        choices.map((choice, index) => (
          <Box
            key={choice.id}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              width: "100%",
              minHeight: "fit-content",
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.7, color: "white" }}>
              Choice {index + 1}
            </Typography>
            <Button
              variant="outlined"
              size="large"
              onClick={() => onChoice(choice.id)}
              disabled={isSarahActive}
              sx={{
                width: "100%",
                textTransform: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                padding: "16px 24px",
                lineHeight: 1.3,
                borderColor: "primary.main",
                "&:hover": {
                  borderColor: "primary.light",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
                "& .MuiChip-root": {
                  fontSize: "1.1rem",
                },
              }}
            >
              {formatTextWithBold(choice.text)}
            </Button>
          </Box>
        ))}

      {!disabled && storyText && (
        <>
          <Divider
            sx={{
              width: "100%",
              my: 3,
              "&::before, &::after": {
                borderColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.5)",
                px: 1,
                fontSize: "0.8rem",
              }}
            >
              OR
            </Typography>
          </Divider>
          <TalkWithSarah
            isNarratorSpeaking={isNarratorSpeaking}
            stopNarration={stopNarration}
            playNarration={playNarration}
            onDecisionMade={onChoice}
            onSarahActiveChange={setIsSarahActive}
            currentContext={`You are Sarah and this is the situation you're in : ${storyText}. Those are your possible decisions : \n ${choices
              .map((choice, index) => `decision ${index + 1} : ${choice.text}`)
              .join("\n ")}.`}
          />
        </>
      )}
    </Box>
  );
}
