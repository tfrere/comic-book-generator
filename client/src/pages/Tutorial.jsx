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
import CallSplitOutlinedIcon from "@mui/icons-material/CallSplitOutlined";
import CreateOutlinedIcon from "@mui/icons-material/CreateOutlined";

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
          width: isMobile ? "90%" : "70%",
          margin: "auto",
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
          Each story takes you on a journey through a unique universe.
          <br />
          <br />
          At every step, you will choose between two different options. until
          you reach the end of the story
          <br />
          <br />
          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: 4 },
              justifyContent: "center",
              mb: { xs: 1, sm: 2 },
              alignItems: "center",
              flexDirection: { xs: "column", sm: "row" },
              width: "100%",
            }}
          >
            <Box
              sx={{
                position: "relative",
                flex: { xs: "none", sm: 1 },
                width: { xs: "50%", sm: "auto" },
                maxWidth: { xs: "160px", sm: "200px" },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: "primary.main",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  p: { xs: 1.5, sm: 2 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  zIndex: 1,
                }}
              >
                <CallSplitOutlinedIcon
                  sx={{
                    fontSize: { xs: 28, sm: 40 },
                    color: "primary.main",
                    mb: 0.5,
                    transform: "rotate(90deg)",
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "primary.main",
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  Make a choice
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                color: "rgba(255,255,255,0.5)",
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.2rem" },
                my: { xs: 0.25, sm: 0 },
              }}
            >
              OR
            </Typography>

            <Box
              sx={{
                position: "relative",
                flex: { xs: "none", sm: 1 },
                width: { xs: "50%", sm: "auto" },
                maxWidth: { xs: "160px", sm: "200px" },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: "secondary.main",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  p: { xs: 1.5, sm: 2 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  zIndex: 1,
                }}
              >
                <CreateOutlinedIcon
                  sx={{
                    fontSize: { xs: 28, sm: 40 },
                    color: "secondary.main",
                    mb: 0.5,
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "secondary.main",
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  Write your own
                </Typography>
              </Box>
            </Box>
          </Box>
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
