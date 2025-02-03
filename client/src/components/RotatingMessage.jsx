import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { useEffect, useState } from "react";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import BrushIcon from "@mui/icons-material/Brush";
import TuneIcon from "@mui/icons-material/Tune";

const icons = {
  "teaching robots to tell bedtime stories...": AutoStoriesIcon,
  "bribing pixels to make pretty pictures...": BrushIcon,
  "calibrating the multiverse...": TuneIcon,
};

export function RotatingMessage({
  messages,
  interval = 3000,
  isVisible = true,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (isVisible) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
      }, interval);
      return () => clearInterval(timer);
    }
  }, [isVisible, messages.length, interval]);

  if (!isVisible) return null;

  const currentMessage = messages[currentIndex];
  const Icon = icons[currentMessage] || AutoStoriesIcon;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "90%" : "auto",
        textAlign: "center",
        px: 2,
      }}
    >
      <Icon
        sx={{
          fontSize: isMobile ? "2.5rem" : "3rem",
          color: "primary.text",
          animation: "pulse 2s infinite",
          "@keyframes pulse": {
            "0%": {
              opacity: 0.1,
              transform: "scale(0.95)",
            },
            "50%": {
              opacity: 0.3,
              transform: "scale(1.05)",
            },
            "100%": {
              opacity: 0.1,
              transform: "scale(0.95)",
            },
          },
        }}
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: isMobile ? "3rem" : "4rem",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            opacity: 0.8,
            fontSize: isMobile ? "1rem" : "1.25rem",
            animation: "fadeIn 0.5s ease-in",
            "@keyframes fadeIn": {
              from: { opacity: 0 },
              to: { opacity: 0.8 },
            },
            textAlign: "center",
            maxWidth: "100%",
            wordBreak: "break-word",
            hyphens: "auto",
            lineHeight: 1.4,
          }}
        >
          {currentMessage}
        </Typography>
      </Box>
    </Box>
  );
}
