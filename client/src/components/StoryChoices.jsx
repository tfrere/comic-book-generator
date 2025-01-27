import { Box, Button, Typography, Chip, Divider } from "@mui/material";

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
  isRecording = false,
  onStartRecording,
  onStopRecording,
}) {
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "white",
            textAlign: "center",
            mb: 1,
          }}
        >
          Choose your next action
        </Typography>
        
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
            <Button
              onClick={() => onChoice(choice.id)}
              disabled={disabled}
              variant="contained"
              sx={{
                width: "100%",
                whiteSpace: "normal",
                textAlign: "left",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              <Typography
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {formatTextWithBold(choice.text)}
              </Typography>
            </Button>
          </Box>
        ))}

        <Divider 
          sx={{ 
            width: "100%", 
            my: 2,
            "&::before, &::after": {
              borderColor: "rgba(255, 255, 255, 0.3)",
            },
          }}
        >
          <Typography
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              px: 2,
              fontSize: "0.875rem",
            }}
          >
            or
          </Typography>
        </Divider>

        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={disabled}
          variant="contained"
          sx={{
            width: "100%",
            py: 1.5,
            backgroundColor: isRecording ? 'error.main' : 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: isRecording ? 'error.dark' : 'primary.dark',
            },
          }}
        >
          {isRecording ? "Stop" : "Try to convince Sarah"}
        </Button>
      </Box>
    </Box>
  );
}
