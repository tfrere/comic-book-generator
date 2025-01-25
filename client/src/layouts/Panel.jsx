import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";

// Component for displaying a single panel
export function Panel({ segment, panel, panelIndex }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset states when the image changes
  useEffect(() => {
    const hasImage = !!segment?.images?.[panelIndex];
    console.log(`[Panel ${panelIndex}] Image changed:`, {
      hasSegment: !!segment,
      hasImage,
      imageContent: segment?.images?.[panelIndex]?.slice(0, 50),
    });

    // Ne réinitialiser les états que si on n'a pas d'image
    if (!hasImage) {
      setImageLoaded(false);
      setIsLoading(true);
    }
  }, [segment?.images?.[panelIndex]]);

  // Log component state changes
  useEffect(() => {
    console.log(`[Panel ${panelIndex}] State updated:`, {
      imageLoaded,
      isLoading,
      hasSegment: !!segment,
      hasImage: !!segment?.images?.[panelIndex],
    });
  }, [imageLoaded, isLoading, segment, panelIndex]);

  const handleImageLoad = () => {
    console.log(`[Panel ${panelIndex}] Image loaded successfully`);
    setImageLoaded(true);
    setIsLoading(false);
  };

  const handleImageError = (error) => {
    console.error(`[Panel ${panelIndex}] Image loading error:`, error);
    setIsLoading(false);
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        gridColumn: panel.gridColumn,
        gridRow: panel.gridRow,
        bgcolor: "white",
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: "8px",
        overflow: "hidden",
        transition: "all 0.3s ease-in-out",
      }}
    >
      {segment && (
        <>
          {/* Image avec fade in */}
          {segment.images?.[panelIndex] && (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                opacity: imageLoaded ? 1 : 0,
                transition: "opacity 0.5s ease-in-out",
              }}
            >
              <img
                src={`data:image/jpeg;base64,${segment.images[panelIndex]}`}
                alt={`Story scene ${panelIndex + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </Box>
          )}

          {/* Spinner de chargement toujours affiché quand l'image n'est pas chargée */}
          {(!segment.images?.[panelIndex] || !imageLoaded) && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1,
                opacity: 0.5,
                backgroundColor: "white",
                zIndex: 1,
              }}
            >
              <CircularProgress size={10} />
            </Box>
          )}

          {/* Texte du segment (uniquement sur le premier panel) */}
          {panelIndex === 0 && segment.text && (
            <Box
              sx={{
                position: "absolute",
                bottom: "20px",
                left: "20px",
                right: "20px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                fontSize: ".9rem",
                padding: "10px",
                borderRadius: "8px",
                boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
                zIndex: 2,
                color: "black",
                "& .MuiChip-root": {
                  color: "black",
                  borderColor: "black",
                },
              }}
            >
              {segment.text}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
