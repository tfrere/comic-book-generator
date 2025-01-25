import { Box, Button } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
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
          component="img"
          src="/book.webp"
          alt="Book cover"
          sx={{
            height: "80vh",
            width: "auto",
            objectFit: "contain",
            borderRadius: "12px",
          }}
        />
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate("/game")}
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
