import React from "react";
import { Box, Paper, Typography, Stack } from "@mui/material";
import { UniverseMetrics } from "./UniverseMetrics";

export const UniverseView = ({ universe }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "calc(100vh - 100px)" }}>
      <Stack spacing={3}>
        {/* Universe Info */}
        <Box>
          <Typography variant="h6" color="primary" gutterBottom>
            Universe Information
          </Typography>
          <UniverseMetrics
            style={universe?.style}
            genre={universe?.genre}
            epoch={universe?.epoch}
            macguffin={universe?.macguffin}
            showTitle={false}
          />
        </Box>

        {/* Base Story */}
        <Box>
          <Typography variant="h6" color="primary" gutterBottom>
            Base Story
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: "background.default",
              whiteSpace: "pre-wrap",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {universe?.base_story}
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  );
};
