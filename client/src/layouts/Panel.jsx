import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useEffect, useState, useRef } from "react";
import { useGame } from "../contexts/GameContext";
import { keyframes } from "@mui/system";
import { StyledText } from "../components/StyledText";

// Animation de rotation complète
const spinFull = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Animation de rotation légère pour le hover
const spinHover = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(30deg);
  }
`;

// Cache global pour les images déjà chargées
const imageCache = new Map();
const loadedImagesState = new Map();

// Component for displaying a single panel
export function Panel({
  panel,
  segment,
  panelIndex,
  totalImagesInPage,
  onImageLoad,
  imageId,
  showText,
}) {
  const { regenerateImage } = useGame();
  const [imageLoaded, setImageLoaded] = useState(
    () => loadedImagesState.get(imageId) || false
  );
  const [imageDisplayed, setImageDisplayed] = useState(
    () => loadedImagesState.get(imageId) || false
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const hasImage = segment?.images?.[panelIndex];
  const imgRef = useRef(null);
  const imageDataRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRegenerate = async () => {
    if (!segment?.imagePrompts?.[panelIndex]) return;

    setIsRegenerating(true);
    setIsSpinning(true);
    try {
      const newImageData = await regenerateImage(
        segment.imagePrompts[panelIndex],
        segment.session_id
      );
      if (newImageData) {
        // Mettre à jour l'image dans le segment
        segment.images[panelIndex] = newImageData;
        // Réinitialiser l'état de chargement
        setImageLoaded(false);
        setImageDisplayed(false);
        // Recharger l'image
        if (imageCache.has(imageId)) {
          URL.revokeObjectURL(imageCache.get(imageId));
          imageCache.delete(imageId);
        }
        loadedImagesState.delete(imageId);
      }
    } finally {
      setIsRegenerating(false);
      // Laisser l'animation se terminer avant de réinitialiser
      setTimeout(() => {
        setIsSpinning(false);
      }, 500);
    }
  };

  // Gérer le chargement initial de l'image
  useEffect(() => {
    if (!hasImage || loadedImagesState.get(imageId)) return;

    // Créer un blob URL unique pour cette image si pas déjà en cache
    if (!imageCache.has(imageId)) {
      const byteCharacters = atob(segment.images[panelIndex]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const blobUrl = URL.createObjectURL(blob);
      imageCache.set(imageId, blobUrl);
      imageDataRef.current = blobUrl;
    } else {
      imageDataRef.current = imageCache.get(imageId);
    }

    const img = new Image();
    img.onload = () => {
      if (!mountedRef.current) return;
      setImageLoaded(true);
      loadedImagesState.set(imageId, true);
      onImageLoad();
    };
    img.src = imageDataRef.current;

    return () => {
      img.onload = null;
    };
  }, [hasImage, imageId, onImageLoad]);

  // Nettoyer le blob URL quand le composant est démonté
  useEffect(() => {
    return () => {
      if (imageDataRef.current && !imageCache.has(imageId)) {
        URL.revokeObjectURL(imageDataRef.current);
      }
    };
  }, [imageId]);

  // Gérer la transition d'affichage
  useEffect(() => {
    if (!imageLoaded) return;

    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      setImageDisplayed(true);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [imageLoaded]);

  return (
    <Box
      sx={{
        gridColumn: panel.gridColumn,
        gridRow: panel.gridRow,
        backgroundColor: "grey.200",
        borderRadius: "4px",
        overflow: "hidden",
        position: "relative",
        "&:hover .refresh-button": {
          opacity: 1,
        },
      }}
    >
      {hasImage && imageDataRef.current && (
        <img
          ref={imgRef}
          src={imageDataRef.current}
          alt={`Panel ${imageId}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imageDisplayed ? 1 : 0,
            transition: "opacity 0.25s ease-in-out",
            willChange: "opacity",
          }}
          loading="eager"
          decoding="sync"
        />
      )}
      {(!hasImage || !imageDisplayed || isRegenerating) && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "grey.300",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: imageDisplayed ? 0 : 1,
            transition: "opacity 0.25s ease-in-out",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <Tooltip title="Regenerate this image" placement="top">
        <IconButton
          className="refresh-button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            opacity: 0,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              "& .MuiSvgIcon-root": {
                animation: `${spinHover} 1s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
              },
            },
            "& .MuiSvgIcon-root": {
              color: "white",
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              animation: isSpinning
                ? `${spinFull} 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite`
                : "none",
              willChange: "transform",
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      {showText && segment?.text && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.95)",
            color: "black",
            textAlign: "center",
            fontWeight: 500,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            fontSize: { xs: "0.775rem", sm: "1rem" }, // Responsive font size
            color: "black",
            lineHeight: 1.1,
            fontWeight: 900,
          }}
        >
          <StyledText text={segment.text} />
        </Box>
      )}
    </Box>
  );
}
