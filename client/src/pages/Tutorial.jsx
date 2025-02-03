import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSoundSystem } from "../contexts/SoundContext";
import { motion } from "framer-motion";
import { GameNavigation } from "../components/GameNavigation";
import { StyledText } from "../components/StyledText";

export function Tutorial() {
  const navigate = useNavigate();
  const { playSound } = useSoundSystem();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleStartGame = () => {
    playSound("page");
    navigate("/game");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GameNavigation />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          height: "100%",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            zIndex: 10,
            textAlign: "center",
            position: "relative",
            color: "white",
            fontSize: {
              xs: "clamp(2rem, 7vw, 2.5rem)",
              sm: "clamp(2.5rem, 8vw, 4rem)",
            },
            px: isMobile ? 2 : 0,
          }}
        >
          How to play
        </Typography>

        <Typography
          variant="body1"
          sx={{
            zIndex: 10,
            textAlign: "center",
            mt: 2,
            maxWidth: isMobile ? "85%" : "50%",
            opacity: 0.8,
            color: "white",
            px: isMobile ? 3 : 0,
            fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
            lineHeight: 1.6,
          }}
        >
          The game will create a unique comic book set in a distinct universe
          for each playthrough.
          <br />
          <br />
          At every stage of the narrative, you will be presented with choices or
          the opportunity to write the next part of the story yourself.
          <br />
          <br />
          It's your turn to write your own story.
        </Typography>

        <Button
          color="primary"
          size="large"
          variant="contained"
          onClick={handleStartGame}
          sx={{
            mt: 4,
            fontSize: isMobile ? "1rem" : "1.2rem",
            padding: isMobile ? "8px 24px" : "12px 36px",
            zIndex: 10,
          }}
        >
          Start the game
        </Button>
      </Box>
    </motion.div>
  );
}

export default Tutorial;
