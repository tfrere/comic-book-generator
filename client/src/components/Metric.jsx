import React from "react";
import { Box, Typography } from "@mui/material";

export const Metric = ({ icon, label, value, color = "default" }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      p: 0.75,
      borderRadius: 1,
      backgroundColor: "background.paper",
      border: 1,
      borderColor: "divider",
      minWidth: 180,
    }}
  >
    <Box sx={{ color: `${color}.main` }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="medium" color="text.primary">
        {value}
      </Typography>
    </Box>
  </Box>
);
