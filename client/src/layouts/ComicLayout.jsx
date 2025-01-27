import { Box, IconButton, Tooltip } from "@mui/material";
import { LAYOUTS } from "./config";
import { groupSegmentsIntoLayouts } from "./utils";
import { useEffect, useRef } from "react";
import { Panel } from "./Panel";
import { StoryChoices } from "../components/StoryChoices";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

// Component for displaying a page of panels
function ComicPage({
  layout,
  layoutIndex,
  isLastPage,
  choices,
  onChoice,
  isLoading,
  showScreenshot,
  onScreenshot,
}) {
  // Calculer le nombre total d'images dans tous les segments de ce layout
  const totalImages = layout.segments.reduce((total, segment) => {
    return total + (segment.images?.length || 0);
  }, 0);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${LAYOUTS[layout.type].gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${LAYOUTS[layout.type].gridRows}, 1fr)`,
          gap: 2,
          height: "100%",
          aspectRatio: "0.7",
          backgroundColor: "white",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          borderRadius: "4px",
          p: 2,
          pb: 4,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {LAYOUTS[layout.type].panels
          .slice(0, totalImages)
          .map((panel, panelIndex) => {
            // Trouver le segment qui contient l'image pour ce panel
            let currentImageIndex = 0;
            let targetSegment = null;
            let targetImageIndex = 0;

            for (const segment of layout.segments) {
              const segmentImageCount = segment.images?.length || 0;
              if (currentImageIndex + segmentImageCount > panelIndex) {
                targetSegment = segment;
                targetImageIndex = panelIndex - currentImageIndex;
                break;
              }
              currentImageIndex += segmentImageCount;
            }

            return (
              <Panel
                key={panelIndex}
                panel={panel}
                segment={targetSegment}
                panelIndex={targetImageIndex}
              />
            );
          })}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "black",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {layoutIndex + 1}
        </Box>
      </Box>
      {isLastPage && (choices?.length > 0 || showScreenshot) && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {showScreenshot && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <Tooltip title="Capturer l'histoire">
                <IconButton
                  onClick={onScreenshot}
                  sx={{
                    border: "1px solid",
                    borderColor: "rgba(255, 255, 255, 0.23)",
                    color: "white",
                    p: 2,
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    },
                  }}
                >
                  <PhotoCameraIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {choices?.length > 0 && (
            <StoryChoices
              choices={choices}
              onChoice={onChoice}
              disabled={isLoading}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

// Main comic layout component
export function ComicLayout({
  segments,
  choices,
  onChoice,
  isLoading,
  showScreenshot,
  onScreenshot,
}) {
  const scrollContainerRef = useRef(null);

  // Effect to scroll to the right when new layouts are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [segments.length]);

  // Filtrer les segments qui sont en cours de chargement
  const loadedSegments = segments.filter((segment) => !segment.isLoading);
  const layouts = groupSegmentsIntoLayouts(loadedSegments);

  return (
    <Box
      ref={scrollContainerRef}
      data-comic-layout
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
        height: "100%",
        width: "100%",
        px: layouts[0]?.type === "COVER" ? "calc(50% - (90vh * 0.5 * 0.5))" : 0,
        overflowX: "auto",
        overflowY: "hidden",
        "&::-webkit-scrollbar": {
          height: "0px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "grey.200",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "grey.400",
          borderRadius: "4px",
        },
      }}
    >
      {layouts.map((layout, layoutIndex) => (
        <ComicPage
          key={layoutIndex}
          layout={layout}
          layoutIndex={layoutIndex}
          isLastPage={layoutIndex === layouts.length - 1}
          choices={choices}
          onChoice={onChoice}
          isLoading={isLoading}
          showScreenshot={showScreenshot}
          onScreenshot={onScreenshot}
        />
      ))}
    </Box>
  );
}
