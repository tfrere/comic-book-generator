// Layout settings for different types
export const LAYOUTS = {
  COVER: {
    gridCols: 1,
    gridRows: 1,
    panels: [
      { width: 1024, height: 1024, gridColumn: "1", gridRow: "1" }, // Format pleine page (1:1 ratio)
    ],
  },
  LAYOUT_1: {
    gridCols: 2,
    gridRows: 2,
    panels: [
      { width: 1024, height: 768, gridColumn: "1", gridRow: "1" }, // 1. Landscape top left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "1" }, // 2. Portrait top right
      { width: 1024, height: 768, gridColumn: "1", gridRow: "2" }, // 3. Landscape middle left
      { width: 768, height: 1024, gridColumn: "2", gridRow: "2" }, // 4. Portrait right, spans bottom rows
    ],
  },
  LAYOUT_2: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 1024, height: 1024, gridColumn: "1 / span 2", gridRow: "1" }, // 1. Large square top left
      { width: 512, height: 1024, gridColumn: "3", gridRow: "1" }, // 2. Portrait top right
      { width: 1024, height: 768, gridColumn: "1 / span 3", gridRow: "2" }, // 3. Landscape bottom, spans full width
    ],
  },
  LAYOUT_3: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      { width: 1024, height: 768, gridColumn: "1 / span 2", gridRow: "1" }, // 1. Landscape top left, spans 2 columns
      { width: 768, height: 1024, gridColumn: "3", gridRow: "1" }, // 2. Portrait top right
      { width: 768, height: 1024, gridColumn: "1", gridRow: "2" }, // 3. Portrait bottom left
      { width: 1024, height: 768, gridColumn: "2 / span 2", gridRow: "2" }, // 4. Landscape bottom right, spans 2 columns
    ],
  },
  LAYOUT_4: {
    gridCols: 8,
    gridRows: 8,
    panels: [
      {
        width: 768,
        height: 768,
        gridColumn: "1 / span 3",
        gridRow: "1 / span 3",
      }, // 1. Square top left
      {
        width: 768,
        height: 1024,
        gridColumn: "1 / span 3",
        gridRow: "4 / span 5",
      }, // 2. Long portrait bottom left
      {
        width: 768,
        height: 1024,
        gridColumn: "5 / span 3",
        gridRow: "1 / span 5",
      }, // 3. Long portrait top right
      {
        width: 768,
        height: 768,
        gridColumn: "5 / span 3",
        gridRow: "6 / span 3",
      }, // 4. Square bottom right
    ],
  },
};

export const defaultLayout = "LAYOUT_1";
export const nonRandomLayouts = Object.keys(LAYOUTS).filter(
  (layout) => layout !== "random"
);

// Helper functions for layout configuration
export const getNextLayoutType = (currentLayoutCount) =>
  `LAYOUT_${(currentLayoutCount % 3) + 1}`;
export const getLayoutDimensions = (layoutType, panelIndex) =>
  LAYOUTS[layoutType]?.panels[panelIndex];
