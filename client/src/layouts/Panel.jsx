import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState, useRef } from "react";

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
}) {
  const [imageLoaded, setImageLoaded] = useState(
    () => loadedImagesState.get(imageId) || false
  );
  const [imageDisplayed, setImageDisplayed] = useState(
    () => loadedImagesState.get(imageId) || false
  );
  const hasImage = segment?.images?.[panelIndex];
  const isFirstPanel = panelIndex === 0;
  const imgRef = useRef(null);
  const imageDataRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
            transition: "opacity 0.5s ease-in-out",
            willChange: "opacity",
          }}
          loading="eager"
          decoding="sync"
        />
      )}
      {(!hasImage || !imageDisplayed) && (
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
            transition: "opacity 0.5s ease-in-out",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      {isFirstPanel && segment?.text && (
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
            fontSize: "1rem",
            fontWeight: 500,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: "black",
              lineHeight: 1.4,
            }}
          >
            {segment.text}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
