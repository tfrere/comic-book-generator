import React from "react";
import { Box, Paper } from "@mui/material";

// Composant pour afficher du JSON avec coloration syntaxique
const JsonView = ({ data, maxHeight = "500px" }) => (
  <Box
    sx={{
      backgroundColor: "grey.900",
      p: 2,
      borderRadius: 1,
      position: "relative",
    }}
  >
    <Box
      sx={{
        maxHeight,
        overflow: "auto",
        fontFamily: "monospace",
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "grey.800",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "grey.600",
          borderRadius: "4px",
          "&:hover": {
            backgroundColor: "grey.500",
          },
        },
        "& pre": {
          margin: 0,
          color: "success.light",
          fontSize: "0.75rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        },
      }}
    >
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Box>
  </Box>
);

export const DebugConsole = ({ gameState, currentStory }) => {
  return (
    <Paper variant="outlined" sx={{ height: "calc(100vh - 100px)" }}>
      <JsonView data={{ gameState, currentStory }} maxHeight="100%" />
    </Paper>
  );
};
