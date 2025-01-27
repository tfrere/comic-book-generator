import { Box, Button, Typography, Chip } from "@mui/material";

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
  containerRef,
}) {
  console.log("ICI", isLastStep, isGameOver);
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
          variant="h3"
          sx={{
            color: "white",
            textAlign: "center",
            mb: 2,
            textTransform: "uppercase",
          }}
        >
          The End
        </Typography>
        {/* <Button
          variant="outlined"
          size="large"
          onClick={() => {
            // Simulate a button click on another button with the id "targetButton"
            document.getElementById("screenshot-button").click();
          }}
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
            mb: 2,
          }}
        >
          Save your story
        </Button> */}
        <Button
          variant="outlined"
          size="large"
          onClick={() => window.location.reload()}
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
          Restart
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
        height: "100%",
        backgroundColor: "transparent",
      }}
    >
      {choices.map((choice, index) => (
        <Box
          key={choice.id}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            width: "100%",
          }}
        >
          <Typography variant="caption" sx={{ opacity: 0.7, color: "white" }}>
            Choice {index + 1}
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={() => onChoice(choice.id)}
            disabled={disabled}
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
              "& .MuiChip-root": {
                fontSize: "1.1rem",
              },
            }}
          >
            {formatTextWithBold(choice.text)}
          </Button>
        </Box>
      ))}
    </Box>
  );
}
