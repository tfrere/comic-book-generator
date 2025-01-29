import { Box } from "@mui/material";
import { keyframes } from "@mui/system";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slideLeft = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
`;

const slideRight = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
`;

// Hook pour précharger l'image et obtenir ses dimensions
const useImageDimensions = (imagePath) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
      setIsLoaded(true);
    };
  }, [imagePath]);

  return { dimensions, isLoaded };
};

const Row = ({ imagePath, direction = "left", speed = 1, containerHeight }) => {
  const { dimensions, isLoaded } = useImageDimensions(imagePath);
  const animation = direction === "left" ? slideLeft : slideRight;
  const duration = 120 / speed;

  if (!isLoaded) return null;

  // Calculer la hauteur de l'image pour qu'elle s'adapte à la hauteur du conteneur
  const scale = containerHeight / dimensions.height;
  const scaledWidth = dimensions.width * scale;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: containerHeight,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* Premier set d'images */}
        <Box
          sx={{
            display: "flex",
            animation: `${animation} ${duration}s linear infinite`,
            height: "100%",
          }}
        >
          {[1, 2, 3].map((i) => (
            <img
              key={i}
              src={imagePath}
              alt="panorama"
              style={{
                height: containerHeight,
                width: scaledWidth,
                objectFit: "contain",
              }}
            />
          ))}
        </Box>
        {/* Second set d'images pour la boucle continue */}
        <Box
          sx={{
            display: "flex",
            animation: `${animation} ${duration}s linear infinite`,
            position: "absolute",
            left: direction === "left" ? "100%" : `-${scaledWidth * 3}px`,
            height: "100%",
          }}
        >
          {[1, 2, 3].map((i) => (
            <img
              key={i}
              src={imagePath}
              alt="panorama"
              style={{
                height: containerHeight,
                width: scaledWidth,
                objectFit: "contain",
              }}
            />
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

export function InfiniteBackground() {
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight;
      setContainerHeight(vh / 3); // Divise la hauteur de la fenêtre en 3
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        zIndex: 0,
        transform: "rotate(-2deg) scale(1.1)",
        transformOrigin: "center center",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)", // Pour Safari
          zIndex: 1,
        },
      }}
    >
      <Row
        imagePath="/bande-1.webp"
        direction="left"
        speed={1}
        containerHeight={containerHeight}
      />
      <Row
        imagePath="/bande-2.webp"
        direction="right"
        speed={0.8}
        containerHeight={containerHeight}
      />
      <Row
        imagePath="/bande-3.webp"
        direction="left"
        speed={1.2}
        containerHeight={containerHeight}
      />
    </Box>
  );
}
