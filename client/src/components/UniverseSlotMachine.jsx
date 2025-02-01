import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion, useAnimation } from "framer-motion";

// Animation timing configuration
const SLOT_ANIMATION_DURATION = 2; // Duration of each slot animation
const SLOT_SPEED = 0.5; // Base speed of the slot animation (higher = faster)
const TOTAL_ANIMATION_DURATION = 1; // Total duration for each slot reel in seconds
const SLOT_START_DELAY = 2; // Delay between each slot start in seconds

// Random words for each category
const RANDOM_STYLES = [
  "Manga",
  "Comics",
  "Franco-Belge",
  "Steampunk",
  "Cyberpunk",
];
const RANDOM_GENRES = ["Action", "Fantasy", "Sci-Fi", "Mystery", "Horror"];
const RANDOM_EPOCHS = ["Future", "Medieval", "Modern", "Ancient", "Victorian"];

const SlotReel = ({ words, isActive, finalValue, onComplete, delay = 0 }) => {
  const containerRef = useRef(null);
  const controls = useAnimation();
  const [reelItems, setReelItems] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const repeatedWords = Array(20)
        .fill([...words])
        .flat()
        .map((word) => ({ word, id: Math.random() }));

      repeatedWords.push({ word: finalValue, id: "final" });
      setReelItems(repeatedWords);

      const itemHeight = 80;
      const totalHeight = repeatedWords.length * itemHeight;

      setTimeout(() => {
        setIsVisible(true);
        controls
          .start({
            y: [-itemHeight, -totalHeight + itemHeight],
            transition: {
              duration: TOTAL_ANIMATION_DURATION / SLOT_SPEED,
              ease: [0.25, 0.1, 0.25, 1.0],
              times: [0, 1],
            },
          })
          .then(() => {
            onComplete?.();
          });
      }, delay * SLOT_START_DELAY * 1000);
    }
  }, [isActive, finalValue, words, delay]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "80px",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#1a1a1a",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.1)",
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          height: "40px",
          zIndex: 2,
          pointerEvents: "none",
        },
        "&::before": {
          top: 0,
          background:
            "linear-gradient(to bottom, #1a1a1a 0%, transparent 100%)",
        },
        "&::after": {
          bottom: 0,
          background: "linear-gradient(to top, #1a1a1a 0%, transparent 100%)",
        },
      }}
    >
      <motion.div
        animate={controls}
        style={{
          position: "absolute",
          width: "100%",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        {reelItems.map(({ word, id }) => (
          <Box
            key={id}
            sx={{
              height: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: id === "final" ? "primary.main" : "#fff",
              fontSize: "1.5rem",
              fontWeight: "bold",
              fontFamily: "'Inter', sans-serif",
              transform: id === "final" ? "scale(1.1)" : "scale(1)",
            }}
          >
            {word}
          </Box>
        ))}
      </motion.div>
    </Box>
  );
};

const SlotSection = ({ label, value, delay, isActive, onComplete, words }) => {
  return (
    <Box
      sx={{
        width: "100%",
        marginBottom: "20px",
        opacity: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          textAlign: "center",
          mb: 1,
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <SlotReel
        words={words}
        isActive={isActive}
        finalValue={value}
        onComplete={onComplete}
        delay={delay}
      />
    </Box>
  );
};

export const UniverseSlotMachine = ({
  style,
  genre,
  epoch,
  activeIndex = 0,
  onComplete,
}) => {
  const handleSlotComplete = (index) => {
    if (index === 2 && activeIndex >= 2) {
      setTimeout(() => {
        onComplete?.();
      }, SLOT_ANIMATION_DURATION * 1000);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#1a1a1a",
        p: 3,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          color: "#fff",
          textAlign: "center",
          fontWeight: 300,
          letterSpacing: "0.1em",
        }}
      >
        Finding a universe
      </Typography>

      <Box
        sx={{
          maxWidth: "500px",
          width: "100%",
          p: 4,
          //   backgroundColor: "rgba(0,0,0,0.2)",
          //   borderRadius: 4,
          //   border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <SlotSection
          label="In the style of..."
          value={style}
          words={RANDOM_STYLES}
          delay={0}
          isActive={activeIndex >= 0}
          onComplete={() => handleSlotComplete(0)}
        />
        <SlotSection
          label="the genre of..."
          value={genre}
          words={RANDOM_GENRES}
          delay={1}
          isActive={activeIndex >= 1}
          onComplete={() => handleSlotComplete(1)}
        />
        <SlotSection
          label="the era of..."
          value={epoch}
          words={RANDOM_EPOCHS}
          delay={2}
          isActive={activeIndex >= 2}
          onComplete={() => handleSlotComplete(2)}
        />
      </Box>
    </Box>
  );
};
