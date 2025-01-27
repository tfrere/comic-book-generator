import { Box, Typography, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export function ErrorDisplay({ message, onRetry }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "white",
        zIndex: 1000,
        gap: 3,
        p: 4,
        textAlign: "center",
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: "error.main" }} />
      <Typography variant="h5" component="h2">
        An error occurred
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
        {message ||
          "The storyteller is temporarily unavailable. Please try again in a few moments..."}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={onRetry}
        sx={{ mt: 2 }}
      >
        Retry
      </Button>
    </Box>
  );
}
