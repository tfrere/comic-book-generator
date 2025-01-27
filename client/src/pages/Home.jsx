import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePageSound } from "../hooks/usePageSound";

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
      style={{ backgroundColor: "#121212", width: "100%" }}
    >
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: "80vh",
            width: "auto",
          }}
        >
          <Box
            component="img"
            src="/book.webp"
            alt="Book cover"
            sx={{
              height: "100%",
              width: "auto",
              objectFit: "contain",
              borderRadius: "4px",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "75%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "white",
              textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: "bold",
                marginBottom: 2,
              }}
            >
              Sarah's Chronicles
            </Typography>
          </Box>
          <Box
            sx={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              color: "white",
              textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            <Typography
              variant="caption"
              display="block"
              sx={{ opacity: 0.9, mb: -1, fontWeight: "black" }}
            >
              a story by
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: "black" }}>
              Mistral Small
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="large"
          onClick={handlePlay}
          sx={{
            fontSize: "1.2rem",
            padding: "12px 36px",
          }}
        >
          Play
        </Button>
      </Box>
    </motion.div>
  );
}
