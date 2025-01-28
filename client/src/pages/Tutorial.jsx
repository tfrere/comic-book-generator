import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { usePageSound } from "../hooks/usePageSound";
import { motion } from "framer-motion";
import { StyledText } from "../components/StyledText";
import { BookPages } from "../components/BookPages";

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
              zIndex: 10,
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
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Pages d'arrière-plan */}
          <BookPages />

          {/* Page principale */}
          <Paper
            elevation={3}
            sx={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              height: "100%",
              backgroundColor: "#fff",
              color: "black",
              padding: "3rem 3rem 3rem 2rem",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              overflowY: "auto",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "4px",
                bottom: 0,
                width: "120px",
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.25), rgba(0,0,0,0))",
                opacity: 0.2,
                pointerEvents: "none",
                zIndex: 1,
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "4px",
                bottom: 0,
                width: "1px",
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.15), transparent)",
                borderRadius: "1px",
                zIndex: 2,
              },
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(0,0,0,0.1)",
                borderRadius: "4px",
              },
            }}
          >
            {/* Section Synopsis */}
            <Box
              sx={{
                maxWidth: "600px",
                margin: "auto",
                textAlign: "center",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h3"
                component="h1"
                textAlign="center"
                gutterBottom
                sx={{
                  width: "100%",
                  color: "#2c1810",
                  fontWeight: "bold",
                  textShadow: `
                    0 -1px 1px rgba(0,0,0,0.2),
                    0 1px 1px rgba(255,255,255,0.3)
                  `,
                  letterSpacing: "0.5px",
                  marginBottom: 3,
                  "&::after": {
                    content: '""',
                    display: "block",
                    width: "40%",
                    height: "1px",
                    background: "rgba(0,0,0,0.2)",
                    margin: "0.5rem auto",
                  },
                }}
              >
                Synopsis
              </Typography>
              <StyledText
                variant="body1"
                paragraph
                sx={{
                  fontWeight: "normal",
                  color: "#2c1810",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  marginBottom: 1.5,
                }}
                text={`You are <strong>Sarah</strong>, an <strong>AI</strong> hunter traveling through <strong>parallel worlds</strong>. Your mission is to track down an <strong>AI</strong> that moves from world to world to avoid destruction.`}
              />
              <StyledText
                variant="body1"
                paragraph
                sx={{
                  fontWeight: "normal",
                  color: "#2c1810",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  marginBottom: 1.5,
                }}
                text={`With each story, you land in a completely new universe. Each <strong>world</strong> presents its own challenges and <strong>obstacles</strong>. You must make crucial <strong>decisions</strong> to advance in your <strong>quest</strong>.`}
              />
              <StyledText
                variant="body1"
                paragraph
                sx={{
                  fontWeight: "normal",
                  color: "#2c1810",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  marginBottom: 0,
                }}
                text={`Every <strong>choice</strong> you make can alter the course of your <strong>pursuit</strong>. <strong>Time</strong> is of the essence, and every <strong>action</strong> counts in this thrilling adventure.`}
              />
            </Box>

            {/* Section How to Play */}
            <Box
              sx={{
                width: "100%",
                borderTop: "1px solid rgba(0,0,0,0.1)",
                paddingTop: 1.5,
                marginTop: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#2c1810",
                  fontWeight: "bold",
                  textShadow: `
                    0 -1px 1px rgba(0,0,0,0.2),
                    0 1px 1px rgba(255,255,255,0.3)
                  `,
                  marginBottom: 0.5,
                  textAlign: "center",
                  fontSize: "1rem",
                }}
              >
                How to play
              </Typography>
              <StyledText
                variant="body1"
                sx={{
                  fontWeight: "normal",
                  color: "#2c1810",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  textAlign: "center",
                  fontStyle: "italic",
                }}
                text="At each step, click one of the available <strong>choices</strong>."
              />
            </Box>
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
