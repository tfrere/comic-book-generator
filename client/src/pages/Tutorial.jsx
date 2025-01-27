import { Box, Typography, Button, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

export function Tutorial() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: 4,
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <Typography variant="h2" component="h1" textAlign="center" gutterBottom>
        How to play?
      </Typography>

      <Box sx={{ maxWidth: "800px", textAlign: "center" }}>
        <Typography variant="h5" paragraph>
          Since the rise of AI, the world is desolate. Your sister,{" "}
          <Chip label="Sarah" size="small" />, is traversing these{" "}
          <Chip label="wastelands" size="small" /> in search of food.
        </Typography>
        <Typography variant="h5" paragraph>
          As her little sister, you stayed in the bunker and you help her make
          decisions with a talkie-walkie.
        </Typography>
        -
        <Typography variant="body1" paragraph>
          When <Chip label="Sarah" size="small" /> calls you, you have two ways
          to help her:
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          1. Choose one of the suggested responses by clicking on it
          <br />
          2. Use your voice to speak directly to{" "}
          <Chip label="Sarah" size="small" /> by clicking the "Try to convince{" "}
          <Chip label="Sarah" size="small" />" button
        </Typography>
        -
        <Typography variant="body1" paragraph>
          As her sibling and a scientist, you need to find the right words and
          tone to help her understand the urgency of climate change, while
          maintaining your close relationship.
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={() => navigate("/game")}
        sx={{
          mt: 4,
          fontSize: "1.2rem",
          padding: "12px 24px",
        }}
      >
        Start the game
      </Button>
    </Box>
  );
}

export default Tutorial;
