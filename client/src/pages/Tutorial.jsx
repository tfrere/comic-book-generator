import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { usePageSound } from "../hooks/usePageSound";
import { motion } from "framer-motion";

export function Tutorial() {
  const navigate = useNavigate();
  const playPageSound = usePageSound();

  const handleStartGame = () => {
    playPageSound();
    navigate("/game");
  };

  const handleBack = () => {
    playPageSound();
    navigate("/");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ backgroundColor: "#121212", width: "100%" }}
    >
      <Box
        sx={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: 4,
          backgroundColor: "background.default",
          position: "relative",
        }}
      >
        <Tooltip title="Back to home">
          <IconButton
            onClick={handleBack}
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            position: "relative",
            width: "auto",
            height: "80vh",
            aspectRatio: "0.66666667",
            display: "flex",
            alignItems: "center", // Center vertically
            justifyContent: "center", // Center horizontally
            "&::before, &::after": {
              content: '""',
              position: "absolute",
              width: "100%",
              height: "100%",
              background: "white",
              borderRadius: 1,
              boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
            },
            "&::before": {
              top: "4px",
              left: "4px",
              transform: "rotate(-1deg)",
              zIndex: 1,
            },
            "&::after": {
              top: "8px",
              left: "8px",
              transform: "rotate(1deg)",
              zIndex: 0,
            },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              height: "100%",
              backgroundColor: "white",
              color: "black",
              padding: 6,
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center", // Center align items
              justifyContent: "center", // Ensure content is centered vertically
              textAlign: "center",
              gap: 4,
              overflowY: "auto",
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              textAlign="center"
              gutterBottom
              color="black"
              sx={{ width: "100%" }}
            >
              Synopsis
            </Typography>
            <Typography
              variant="body1"
              paragraph
              color="black"
              sx={{ fontWeight: "normal" }}
            >
              You are <strong>Sarah</strong>, an <strong>AI</strong> hunter
              traveling through
              <strong>parallel worlds</strong>. Your mission is to track down an{" "}
              <strong>AI</strong> that moves from world to world to avoid
              destruction.
              <br />
              <br />
              You must make crucial <strong>decisions</strong> to advance in
              your
              <strong>quest</strong>. Each <strong>world</strong> presents its
              own challenges and
              <strong>obstacles</strong>, and every <strong>choice</strong> you
              make can alter the course of your <strong>pursuit</strong>.{" "}
              <strong>Time</strong> is of the essence, and every{" "}
              <strong>action</strong> counts in this thrilling adventure.
            </Typography>
            <Typography variant="h4">How to play</Typography>
            <Typography variant="body1" sx={{ fontWeight: "normal" }}>
              At each step, click one of the available <strong>choices</strong>.
            </Typography>
          </Paper>
        </Box>

        <Button
          variant="outlined"
          size="large"
          onClick={handleStartGame}
          sx={{
            fontSize: "1.2rem",
            padding: "12px 24px",
          }}
        >
          Start the game
        </Button>
      </Box>
    </motion.div>
  );
}

export default Tutorial;
