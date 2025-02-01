import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import {
  Timer as TimerIcon,
  LocationOn as LocationIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Palette as PaletteIcon,
} from "@mui/icons-material";

const DebugItem = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    {icon}
    <Typography variant="caption" sx={{ opacity: 0.7 }}>
      {label}:
    </Typography>
    <Typography variant="caption" sx={{ fontWeight: "medium" }}>
      {value}
    </Typography>
  </Box>
);

export const GameDebugPanel = ({ gameState, currentStory, visible }) => {
  if (!visible) return null;

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 300,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        color: "white",
        p: 2,
        borderRadius: 2,
        zIndex: 1000,
      }}
    >
      <Stack spacing={2}>
        {/* Universe Info */}
        <Box>
          <Typography
            variant="caption"
            color="primary.main"
            sx={{ fontWeight: "bold", display: "block", mb: 1 }}
          >
            UNIVERSE
          </Typography>
          <Stack spacing={0.5}>
            <DebugItem
              icon={<PaletteIcon fontSize="small" sx={{ opacity: 0.7 }} />}
              label="Style"
              value={
                gameState?.universe_style?.name || gameState?.universe_style
              }
            />
            {gameState?.universe_style?.selected_artist && (
              <DebugItem
                icon={<PersonIcon fontSize="small" sx={{ opacity: 0.7 }} />}
                label="Artist"
                value={gameState.universe_style.selected_artist}
              />
            )}
          </Stack>
        </Box>

        {/* Game State */}
        <Box>
          <Typography
            variant="caption"
            color="primary.main"
            sx={{ fontWeight: "bold", display: "block", mb: 1 }}
          >
            GAME STATE
          </Typography>
          <Stack spacing={0.5}>
            <DebugItem
              icon={<TimerIcon fontSize="small" sx={{ opacity: 0.7 }} />}
              label="Time"
              value={currentStory?.time}
            />
            <DebugItem
              icon={<LocationIcon fontSize="small" sx={{ opacity: 0.7 }} />}
              label="Location"
              value={currentStory?.location}
            />
            <DebugItem
              icon={<PsychologyIcon fontSize="small" sx={{ opacity: 0.7 }} />}
              label="Story Beat"
              value={gameState?.story_beat}
            />
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};
