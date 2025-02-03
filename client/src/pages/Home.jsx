import {
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSoundSystem } from "../contexts/SoundContext";
import { BlinkingText } from "../components/BlinkingText";
import { BookPages } from "../components/BookPages";

export function Home() {
  const navigate = useNavigate();
  const { playSound } = useSoundSystem();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handlePlay = () => {
    playSound("page");
    navigate("/tutorial");
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
          variant="h1"
          sx={{
            zIndex: 10,
            textAlign: "center",
            position: "relative",
            fontSize: {
              xs: "clamp(2.5rem, 8vw, 3.5rem)",
              sm: "clamp(3.5rem, 10vw, 6rem)",
            },
            lineHeight: {
              xs: 1.2,
              sm: 1.1,
            },
          }}
        >
          interactive
          <br /> comic book
          <div
            style={{
              position: "absolute",
              top: isMobile ? "-20px" : "-40px",
              left: isMobile ? "-40px" : "-120px",
              fontSize: isMobile
                ? "clamp(1rem, 4vw, 1.5rem)"
                : "clamp(1.5rem, 3vw, 2.5rem)",
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
            maxWidth: isMobile ? "80%" : "50%",
            opacity: 0.8,
            px: isMobile ? 2 : 0,
            fontSize: "clamp(0.875rem, 2vw, 1.125rem)",
            lineHeight: 1.6,
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
            fontSize: isMobile ? "1rem" : "1.2rem",
            padding: isMobile ? "8px 24px" : "12px 36px",
            zIndex: 10,
          }}
        >
          Play
        </Button>
      </Box>
    </motion.div>
  );
}
