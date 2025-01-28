import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import CreateIcon from "@mui/icons-material/Create";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import PaletteIcon from "@mui/icons-material/Palette";

const defaultMessages = [
  "waking up a sleepy AI...",
  "teaching robots to tell bedtime stories...",
  "bribing pixels to make pretty pictures...",
];

const iconMap = {
  story: CreateIcon,
  universe: AutoStoriesIcon,
  art: PaletteIcon,
};

export const LoadingScreen = ({
  messages = defaultMessages,
  icon = "story",
  messageInterval = 3000,
  iconColor = "white",
  textColor = "white",
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const IconComponent = iconMap[icon] || CreateIcon;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, messageInterval);
    return () => clearInterval(interval);
  }, [messages.length, messageInterval]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <IconComponent
          sx={{
            fontSize: 40,
            color: iconColor,
            opacity: 0.2,
          }}
        />
      </motion.div>
      <motion.div
        key={currentMessage}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.3 }}
      >
        <Typography
          variant="body1"
          sx={{
            color: textColor,
            opacity: 0.8,
            fontStyle: "italic",
          }}
        >
          {messages[currentMessage]}
        </Typography>
      </motion.div>
    </Box>
  );
};
