// Panel size constants
export const PANEL_SIZES = {
  PORTRAIT: { width: 512, height: 768 },
  LANDSCAPE: { width: 768, height: 512 },
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
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "2", gridRow: "1" }, // Portrait top right
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "1", gridRow: "2" }, // Landscape middle left
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "2", gridRow: "2" }, // Portrait right
    ],
  },
  LAYOUT_2: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      {
        ...PANEL_SIZES.LANDSCAPE,
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
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "1 / span 2", gridRow: "1" }, // Wide panoramic top
      {
        ...PANEL_SIZES.PORTRAIT,
        gridColumn: "1",
        gridRow: GRID.FULL_HEIGHT_FROM_2,
      }, // Tall portrait left
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "2", gridRow: "2" }, // Square middle right
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: "2", gridRow: "3" }, // Square bottom right
    ],
  },
  LAYOUT_5: {
    gridCols: 3,
    gridRows: 3,
    panels: [
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: GRID.FULL_WIDTH, gridRow: "1" }, // Wide panoramic top
      { ...PANEL_SIZES.PORTRAIT, gridColumn: "1", gridRow: "2 / span 2" }, // Tall portrait left
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: "2 / span 2",
        gridRow: "2 / span 2",
      }, // Large square right
    ],
  },
  LAYOUT_7: {
    gridCols: 1,
    gridRows: 2,
    panels: [
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: GRID.FULL_WIDTH, gridRow: "1" }, // Portrait top right
      { ...PANEL_SIZES.LANDSCAPE, gridColumn: GRID.FULL_WIDTH, gridRow: "2" }, // Full width landscape bottom
    ],
  },
};

export const defaultLayout = "LAYOUT_1";
export const nonRandomLayouts = Object.keys(LAYOUTS).filter(
  (layout) => layout !== "COVER"
);

// Grouper les layouts par nombre de panneaux
export const LAYOUTS_BY_PANEL_COUNT = {
  1: ["COVER"],
  2: ["LAYOUT_7"], // Layouts avec exactement 2 panneaux
  3: ["LAYOUT_5"], // Layouts avec exactement 3 panneaux
  4: ["LAYOUT_3"], // Layouts avec exactement 4 panneaux
};

// Helper functions for layout configuration
export const getNextLayoutType = (currentLayoutCount, imageCount) => {
  // Obtenir les layouts disponibles pour ce nombre d'images
  const availableLayouts = LAYOUTS_BY_PANEL_COUNT[imageCount] || [];

  if (!availableLayouts.length) {
    // Si aucun layout n'est disponible pour ce nombre d'images exact,
    // utiliser le premier layout qui peut contenir au moins ce nombre d'images
    for (let i = imageCount + 1; i <= 4; i++) {
      if (LAYOUTS_BY_PANEL_COUNT[i]?.length) {
        availableLayouts.push(...LAYOUTS_BY_PANEL_COUNT[i]);
        break;
      }
    }
  }

  if (!availableLayouts.length) {
    return "LAYOUT_1"; // Layout par défaut si rien ne correspond
  }

  // Sélectionner un layout aléatoire parmi ceux disponibles
  const randomIndex = Math.floor(Math.random() * availableLayouts.length);
  return availableLayouts[randomIndex];
};

export const getLayoutDimensions = (layoutType, panelIndex) =>
  LAYOUTS[layoutType]?.panels[panelIndex];
