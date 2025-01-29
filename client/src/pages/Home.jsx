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
        <Box
          sx={{
            position: "relative",
            height: "80vh",
            width: "calc(80vh * 0.66666667)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: "100%",
              width: "100%",
              zIndex: 1,
            }}
          >
            <BookPages />
            <Box
              sx={{
                position: "relative",
                height: "100%",
                width: "100%",
                zIndex: 1,
              }}
            >
              <Box
                component="img"
                src="/book-multiverse.webp"
                alt="Book cover"
                sx={{
                  height: "100%",
                  width: "100%",
                  objectFit: "cover",
                  borderRadius: "4px",
                  position: "relative",
                  boxShadow: "0 0 20px rgba(0,0,0,0.2)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: "10px",
                  bottom: 0,
                  width: "4px",
                  background:
                    "linear-gradient(to right, rgba(255,255,255,0.3), transparent)",
                  zIndex: 2,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: "15px",
                  bottom: 0,
                  width: "1px",
                  background:
                    "linear-gradient(to right, rgba(0,0,0,0.3), transparent)",
                  zIndex: 2,
                }}
              />
            </Box>
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)",
                borderRadius: "4px",
                zIndex: 2,
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
                // textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
                zIndex: 3,
              }}
            >
              <Box sx={{ position: "relative" }}>
                <BlinkingText
                  sx={{
                    position: "absolute",
                    top: "-40px",
                    right: "-15px",
                    transform: "rotate(15deg)",
                    zIndex: 3,
                  }}
                >
                  multiverse edition
                </BlinkingText>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: "bold",
                    marginBottom: 2,
                    color: "#f0e6d9",
                    textShadow: `
                      0 -1px 1px rgba(0,0,0,0.3),
                      0 1px 1px rgba(255,255,255,0.2)
                    `,
                    letterSpacing: "0.5px",
                    filter: "brightness(0.95)",
                  }}
                >
                  Sarah's Chronicles
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                position: "absolute",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 3,
              }}
            >
              <Typography
                variant="caption"
                display="block"
                sx={{
                  mb: -1,
                  fontWeight: "black",
                  color: "#f0e6d9",
                  textShadow: `
                    0 -1px 1px rgba(0,0,0,0.3),
                    0 1px 1px rgba(255,255,255,0.2)
                  `,
                  letterSpacing: "0.5px",
                  filter: "brightness(0.95)",
                }}
              >
                a story by
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "black",
                  color: "#f0e6d9",
                  textShadow: `
                    0 -1px 1px rgba(0,0,0,0.3),
                    0 1px 1px rgba(255,255,255,0.2)
                  `,
                  letterSpacing: "0.5px",
                  filter: "brightness(0.95)",
                }}
              >
                Mistral Small
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="large"
          onClick={handlePlay}
          sx={{
            mt: 4,
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
