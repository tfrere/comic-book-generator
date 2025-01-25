import { Box, CircularProgress, Typography } from "@mui/material";
import { LAYOUTS } from "./config";
import { groupSegmentsIntoLayouts } from "./utils";
import { useEffect, useRef } from "react";

// Component for displaying a single panel
function Panel({ segment, panel }) {
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
      }}
    >
      {segment ? (
        <>
          {segment.image_base64 ? (
            <img
              src={`data:image/jpeg;base64,${segment.image_base64}`}
              alt="Story scene"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "8px",
                opacity: 0,
                transition: "opacity 0.5s ease-in-out",
              }}
              onLoad={(e) => {
                e.target.style.opacity = "1";
              }}
            />
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {!segment.imageRequestCancelled && (
                <CircularProgress sx={{ opacity: 0.3 }} />
              )}
              {segment.imageRequestCancelled && (
                <Typography variant="caption" color="text.secondary">
                  Image non chargée
                </Typography>
              )}
            </Box>
          )}
          <Box
            sx={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              right: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              fontSize: ".9rem",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {segment.text}
          </Box>
        </>
      ) : null}
    </Box>
  );
}

// Component for displaying a page of panels
function ComicPage({ layout, layoutIndex }) {
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
      {LAYOUTS[layout.type].panels.map((panel, panelIndex) => (
        <Panel
          key={panelIndex}
          panel={panel}
          segment={layout.segments[panelIndex]}
        />
      ))}
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
        px: layouts[0]?.type === "COVER" ? "calc(50% - (90vh * 0.7 * 0.5))" : 0,
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
