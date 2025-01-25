// Layout settings for different types
// export const LAYOUTS = {
//   COVER: {
//     gridCols: 1,
//     gridRows: 1,
//     panels: [
//       { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
//     ],
//   },
//   LAYOUT_1: {
//     gridCols: 1,
//     gridRows: 1,
//     panels: [
//       { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
//     ],
//   },
//   LAYOUT_2: {
//     gridCols: 1,
//     gridRows: 1,
//     panels: [
//       { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
//     ],
//   },
//   LAYOUT_3: {
//     gridCols: 1,
//     gridRows: 1,
//     panels: [
//       { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
//     ],
//   },
//   LAYOUT_4: {
//     gridCols: 1,
//     gridRows: 1,
//     panels: [
//       { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
//     ],
//   },
// };

export const LAYOUTS = {
  COVER: {
    gridCols: 1,
    gridRows: 1,
    panels: [
      { width: 512, height: 1024, gridColumn: "1", gridRow: "1" }, // Format portrait
    ],
  },
  LAYOUT_1: {
    gridCols: 2,
    gridRows: 2,
    panels: [
      { width: 1024, height: 768, gridColumn: "1", gridRow: "1" }, // Landscape top left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "1" }, // Portrait top right
      { width: 1024, height: 768, gridColumn: "1", gridRow: "2" }, // Landscape middle left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "2" }, // Portrait right
    ],
  },
  LAYOUT_2: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 1024, height: 1024, gridColumn: "1 / span 2", gridRow: "1" }, // Large square top left
      { width: 512, height: 1024, gridColumn: "3", gridRow: "1" }, // Portrait top right
      { width: 1024, height: 768, gridColumn: "1 / span 3", gridRow: "2" }, // Full width landscape bottom
    ],
  },
  LAYOUT_3: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 1024, height: 768, gridColumn: "1 / span 2", gridRow: "1" }, // Wide landscape top left
      { width: 512, height: 1024, gridColumn: "3", gridRow: "1" }, // Portrait top right
      { width: 512, height: 1024, gridColumn: "1", gridRow: "2" }, // Portrait bottom left
      { width: 1024, height: 768, gridColumn: "2 / span 2", gridRow: "2" }, // Wide landscape bottom right
    ],
  },
  LAYOUT_4: {
    gridCols: 2,
    gridRows: 3,
    panels: [
      { width: 1024, height: 512, gridColumn: "1 / span 2", gridRow: "1" }, // Wide panoramic top
      { width: 512, height: 1024, gridColumn: "1", gridRow: "2 / span 2" }, // Tall portrait left
      { width: 512, height: 512, gridColumn: "2", gridRow: "2" }, // Square middle right
      { width: 512, height: 512, gridColumn: "2", gridRow: "3" }, // Square bottom right
    ],
  },
  LAYOUT_5: {
    gridCols: 3,
    gridRows: 3,
    panels: [
      { width: 1024, height: 512, gridColumn: "1 / span 3", gridRow: "1" }, // Wide panoramic top
      { width: 512, height: 1024, gridColumn: "1", gridRow: "2 / span 2" }, // Tall portrait left
      {
        width: 1024,
        height: 1024,
        gridColumn: "2 / span 2",
        gridRow: "2 / span 2",
      }, // Large square right
    ],
  },
  LAYOUT_6: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 512, height: 1024, gridColumn: "1", gridRow: "1 / span 2" }, // Tall portrait left
      { width: 512, height: 512, gridColumn: "2", gridRow: "1" }, // Square top middle
      { width: 512, height: 1024, gridColumn: "3", gridRow: "1 / span 2" }, // Tall portrait right
      { width: 512, height: 512, gridColumn: "2", gridRow: "2" }, // Square bottom middle
    ],
  },
};

export const defaultLayout = "LAYOUT_1";
export const nonRandomLayouts = Object.keys(LAYOUTS).filter(
  (layout) => layout !== "COVER"
);

// Helper functions for layout configuration
export const getNextLayoutType = (currentLayoutCount) => {
  // Get all available layouts except COVER
  const availableLayouts = Object.keys(LAYOUTS).filter(
    (layout) => layout !== "COVER"
  );

  // Use a pseudo-random selection based on the current count
  // but avoid repeating the same layout twice in a row
  const previousLayout = `LAYOUT_${
    (currentLayoutCount % availableLayouts.length) + 1
  }`;
  let nextLayout;

  do {
    const randomIndex =
      Math.floor(Math.random() * (availableLayouts.length - 1)) + 1;
    nextLayout = `LAYOUT_${randomIndex}`;
  } while (nextLayout === previousLayout);

  return nextLayout;
};

export const getLayoutDimensions = (layoutType, panelIndex) =>
  LAYOUTS[layoutType]?.panels[panelIndex];
