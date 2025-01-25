import { Box } from "@mui/material";
import { LAYOUTS } from "./config";
import { groupSegmentsIntoLayouts } from "./utils";
import { useEffect, useRef } from "react";
import { Panel } from "./Panel";

// Component for displaying a page of panels
function ComicPage({ layout, layoutIndex }) {
  // Calculer le nombre total d'images dans tous les segments de ce layout
  const totalImages = layout.segments.reduce((total, segment) => {
    return total + (segment.images?.length || 0);
  }, 0);

  return (
    <Box
      key={layoutIndex}
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
        flexShrink: 0,
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
    </Box>
  );
}

// Main comic layout component
export function ComicLayout({ segments }) {
  const layouts = groupSegmentsIntoLayouts(segments);
  const scrollContainerRef = useRef(null);

  // Effect to scroll to the right when new layouts are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [layouts.length]); // Only run when the number of layouts changes

  return (
    <Box
      ref={scrollContainerRef}
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
        />
      ))}
    </Box>
  );
}
