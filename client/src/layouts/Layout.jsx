import { Box, CircularProgress, Typography } from "@mui/material";

// Layout settings for different types
export const LAYOUTS = {
  COVER: {
    gridCols: 1,
    gridRows: 1,
    panels: [
      { width: 1024, height: 1536, gridColumn: "1", gridRow: "1" }, // Format pleine page (2:3 ratio)
    ],
  },
  LAYOUT_1: {
    gridCols: 2,
    gridRows: 3,
    panels: [
      { width: 1024, height: 768, gridColumn: "1", gridRow: "1" }, // Landscape top left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "1 / span 2" }, // Portrait top right, spans 2 rows
      { width: 768, height: 1024, gridColumn: "1", gridRow: "2 / span 2" }, // Portrait bottom left, spans 2 rows
      { width: 1024, height: 768, gridColumn: "2", gridRow: "3" }, // Landscape bottom right
    ],
  },
  LAYOUT_2: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 768, height: 1024, gridColumn: "1", gridRow: "1" }, // Portrait top left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "1" }, // Portrait top middle
      { width: 512, height: 1024, gridColumn: "3", gridRow: "1 / span 2" }, // Tall portrait right, spans full height
      { width: 1024, height: 768, gridColumn: "1 / span 2", gridRow: "2" }, // Landscape bottom, spans 2 columns
    ],
  },
  LAYOUT_3: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 1024, height: 768, gridColumn: "1 / span 2", gridRow: "1" }, // Landscape top, spans 2 columns
      { width: 768, height: 1024, gridColumn: "3", gridRow: "1" }, // Portrait top right
      { width: 768, height: 1024, gridColumn: "1", gridRow: "2" }, // Portrait bottom left
      { width: 1024, height: 768, gridColumn: "2 / span 2", gridRow: "2" }, // Landscape bottom right, spans 2 columns
    ],
  },
  LAYOUT_4: {
    gridCols: 8,
    gridRows: 8,
    panels: [
      {
        width: 512,
        height: 1024,
        gridColumn: "1 / span 6",
        gridRow: "1 / span 2",
      }, // Wide top
      {
        width: 1024,
        height: 768,
        gridColumn: "3 / span 6",
        gridRow: "3 / span 1",
      }, // Middle right
      {
        width: 768,
        height: 1024,
        gridColumn: "2 / span 6",
        gridRow: "4 / span 2",
      }, // Middle center
      {
        width: 1024,
        height: 512,
        gridColumn: "1 / span 8",
        gridRow: "6 / span 2",
      }, // Wide bottom
    ],
  },
};

// Function to group segments into layouts
function groupSegmentsIntoLayouts(segments) {
  if (segments.length === 0) return [];

  const layouts = [];

  // Premier segment toujours en COVER s'il est marqué comme first_step
  if (segments[0].is_first_step) {
    layouts.push({
      type: "COVER",
      segments: [segments[0]],
    });
  }

  // Segments du milieu (on exclut le premier s'il était en COVER)
  const startIndex = segments[0].is_first_step ? 1 : 0;
  const middleSegments = segments.slice(startIndex);
  let currentIndex = 0;

  while (currentIndex < middleSegments.length) {
    const segment = middleSegments[currentIndex];

    // Si c'est le dernier segment (mort ou victoire), on le met en COVER
    if (segment.is_last_step) {
      layouts.push({
        type: "COVER",
        segments: [segment],
      });
    } else {
      // Sinon on utilise un layout normal
      const layoutType = `LAYOUT_${(layouts.length % 3) + 1}`;
      const maxPanels = LAYOUTS[layoutType].panels.length;
      const availableSegments = middleSegments
        .slice(currentIndex)
        .filter((s) => !s.is_last_step);

      if (availableSegments.length > 0) {
        layouts.push({
          type: layoutType,
          segments: availableSegments.slice(0, maxPanels),
        });
        currentIndex += Math.min(maxPanels, availableSegments.length) - 1;
      }
    }

    currentIndex++;
  }

  console.log("Generated layouts:", layouts); // Debug log
  return layouts;
}

export function ComicLayout({ segments }) {
  const layouts = groupSegmentsIntoLayouts(segments);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
        height: "100%",
        width: "100%",
      }}
    >
      {layouts.map((layout, layoutIndex) => (
        <Box
          key={layoutIndex}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${
              LAYOUTS[layout.type].gridCols
            }, 1fr)`,
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
          {/* Render all panels of the layout */}
          {LAYOUTS[layout.type].panels.map((panel, panelIndex) => {
            // Find the segment for this panel position if it exists
            const segment = layout.segments[panelIndex];

            return (
              <Box
                key={panelIndex}
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
                  // If there's a segment, render image and text
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
                        }}
                      >
                        <CircularProgress sx={{ opacity: 0.3 }} />
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
          })}
        </Box>
      ))}
    </Box>
  );
}
