import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePageSound } from "../hooks/usePageSound";
import { BlinkingText } from "../components/BlinkingText";
import { BookPages } from "../components/BookPages";
import { InfiniteBackground } from "../components/InfiniteBackground";

export function Home() {
  const navigate = useNavigate();
  const playPageSound = usePageSound();

  const handlePlay = () => {
    playPageSound();
    navigate("/tutorial");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ width: "100%", height: "100vh", position: "relative" }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          width: "100%",
          position: "relative",
        }}
      >
        <InfiniteBackground />

        <Typography
          variant="h1"
          sx={{ zIndex: 10, textAlign: "center", position: "relative" }}
        >
          interactive
          <br /> comic book
          <div
            style={{
              position: "absolute",
              top: "-40px",
              left: "-120px",
              fontSize: "2.5rem",
              transform: "rotate(-15deg)",
            }}
          >
            IA driven{" "}
          </div>
        </Typography>

        <Typography
          variant="body1"
          sx={{
            zIndex: 10,
            textAlign: "center",
            mt: 2,
            maxWidth: "30%",
            opacity: 0.8,
          }}
        >
          Experience a unique comic book where artificial intelligence brings
          your choices to life, shaping the narrative as you explore.
        </Typography>
        <Button
          color="primary"
          size="large"
          variant="contained"
          onClick={handlePlay}
          sx={{
            mt: 4,
            fontSize: "1.2rem",
            padding: "12px 36px",
            zIndex: 10,
          }}
        >
          Play
        </Button>
      </Box>
    </motion.div>
  );
}
