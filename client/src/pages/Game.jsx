import { motion } from "framer-motion";
import App from "./game/App";
import { Box } from "@mui/material";

export const Game = () => {
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
          bgcolor: "background.default",
        }}
      >
        <App />
      </Box>
    </motion.div>
  );
};

export default Game;
