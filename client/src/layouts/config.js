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

// Panel size constants
const PANEL_SIZES = {
  PORTRAIT: { width: 512, height: 1024 },
  PORTRAIT_MEDIUM: { width: 768, height: 1024 },
  LANDSCAPE: { width: 1024, height: 768 },
  SQUARE: { width: 512, height: 512 },
  SQUARE_LARGE: { width: 1024, height: 1024 },
  PANORAMIC: { width: 1024, height: 512 },
  COVER_SIZE: { width: 512, height: 768 },
};

// Grid span helpers
const GRID = {
  FULL_WIDTH: "1 / span 3",
  TWO_THIRDS: "1 / span 2",
  FULL_HEIGHT: "1 / span 2",
  FULL_HEIGHT_FROM_2: "2 / span 2", // Pour les éléments qui commencent à partir de la ligne 2
};

export const LAYOUTS = {
  COVER: {
    gridCols: 1,
    gridRows: 1,
    panels: [
      { ...PANEL_SIZES.COVER_SIZE, gridColumn: "1", gridRow: "1" }, // Format portrait
    ],
  },
  LAYOUT_1: {
    gridCols: 2,
    gridRows: 2,
    panels: [
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "1", gridRow: "1" }, // Landscape top left
      { ...PANEL_SIZES.PORTRAIT_MEDIUM, gridColumn: "2", gridRow: "1" }, // Portrait top right
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "1", gridRow: "2" }, // Landscape middle left
      { ...PANEL_SIZES.PORTRAIT_MEDIUM, gridColumn: "2", gridRow: "2" }, // Portrait right
    ],
  },
  LAYOUT_2: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      {
        ...PANEL_SIZES.SQUARE_LARGE,
        gridColumn: GRID.TWO_THIRDS,
        gridRow: "1",
      }, // Large square top left
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "3", gridRow: "1" }, // Portrait top right
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: GRID.FULL_WIDTH, gridRow: "2" }, // Full width landscape bottom
    ],
  },
  LAYOUT_3: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: GRID.TWO_THIRDS, gridRow: "1" }, // Wide landscape top left
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "3", gridRow: "1" }, // Portrait top right
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "1", gridRow: "2" }, // Portrait bottom left
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "2 / span 2", gridRow: "2" }, // Wide landscape bottom right
    ],
  },
  LAYOUT_4: {
    gridCols: 2,
    gridRows: 3,
    panels: [
      { ...PANEL_SIZES.PANORAMIC, gridColumn: "1 / span 2", gridRow: "1" }, // Wide panoramic top
      {
        ...PANEL_SIZES.PORTRAIT,
        gridColumn: "1",
        gridRow: GRID.FULL_HEIGHT_FROM_2,
      }, // Tall portrait left
      { ...PANEL_SIZES.SQUARE, gridColumn: "2", gridRow: "2" }, // Square middle right
      { ...PANEL_SIZES.SQUARE, gridColumn: "2", gridRow: "3" }, // Square bottom right
    ],
  },
  LAYOUT_5: {
    gridCols: 3,
    gridRows: 3,
    panels: [
      { ...PANEL_SIZES.PANORAMIC, gridColumn: GRID.FULL_WIDTH, gridRow: "1" }, // Wide panoramic top
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "1", gridRow: "2 / span 2" }, // Tall portrait left
      {
        ...PANEL_SIZES.SQUARE_LARGE,
        gridColumn: "2 / span 2",
        gridRow: "2 / span 2",
      }, // Large square right
    ],
  },
  LAYOUT_6: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "1", gridRow: GRID.FULL_HEIGHT }, // Tall portrait left
      { ...PANEL_SIZES.SQUARE, gridColumn: "2", gridRow: "1" }, // Square top middle
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "3", gridRow: GRID.FULL_HEIGHT }, // Tall portrait right
      { ...PANEL_SIZES.SQUARE, gridColumn: "2", gridRow: "2" }, // Square bottom middle
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
