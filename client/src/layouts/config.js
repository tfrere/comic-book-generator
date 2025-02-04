// Panel size constants
export const PANEL_SIZES = {
  PORTRAIT: { width: 512, height: 768 },
  COLUMN: { width: 512, height: 1024 },
  LANDSCAPE: { width: 768, height: 512 },
  PANORAMIC: { width: 1024, height: 512 },
  COVER_SIZE: { width: 512, height: 1024 },
  SQUARE: { width: 512, height: 512 },
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
      {
        ...PANEL_SIZES.COVER_SIZE,
        gridColumn: "1",
        gridRow: "1",
        acceptText: true,
      }, // Format portrait
    ],
  },
  LAYOUT_1: {
    gridCols: 2,
    gridRows: 2,
    panels: [
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: "1",
        gridRow: "1",
        acceptText: true,
      }, // Landscape top left
      {
        ...PANEL_SIZES.PORTRAIT,
        gridColumn: "2",
        gridRow: "1",
        acceptText: false,
      }, // Portrait top right
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: "1",
        gridRow: "2",
        acceptText: true,
      }, // Landscape middle left
      {
        ...PANEL_SIZES.PORTRAIT,
        gridColumn: "2",
        gridRow: "2",
        acceptText: false,
      }, // Portrait right
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
        acceptText: true,
      }, // Large square top left
      {
        ...PANEL_SIZES.PORTRAIT,
        gridColumn: "3",
        gridRow: "1",
        acceptText: false,
      }, // Portrait top right
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: GRID.FULL_WIDTH,
        gridRow: "2",
        acceptText: false,
      }, // Full width landscape bottom
    ],
  },
  LAYOUT_3: {
    gridCols: 3,
    gridRows: 2,
    panels: [
      {
        ...PANEL_SIZES.SQUARE,
        gridColumn: GRID.TWO_THIRDS,
        gridRow: "1",
        acceptText: true,
      }, // Wide landscape top left
      {
        ...PANEL_SIZES.COLUMN,
        gridColumn: "3",
        gridRow: "1",
        acceptText: false,
      }, // COLUMN top right
      {
        ...PANEL_SIZES.COLUMN,
        gridColumn: "1",
        gridRow: "2",
        acceptText: false,
      }, // COLUMN bottom left
      {
        ...PANEL_SIZES.SQUARE,
        gridColumn: "2 / span 2",
        gridRow: "2",
        acceptText: true,
      }, // Wide landscape bottom right
    ],
  },
  LAYOUT_4: {
    gridCols: 2,
    gridRows: 3,
    panels: [
      {
        ...PANEL_SIZES.PANORAMIC,
        gridColumn: "1 / span 2",
        gridRow: "1",
        acceptText: true,
      }, // Wide panoramic top
      {
        ...PANEL_SIZES.COLUMN,
        gridColumn: "1",
        gridRow: GRID.FULL_HEIGHT_FROM_2,
        acceptText: false,
      }, // Tall portrait left
      {
        ...PANEL_SIZES.SQUARE,
        gridColumn: "2",
        gridRow: "2",
        acceptText: false,
      }, // Square middle right
      {
        ...PANEL_SIZES.SQUARE,
        gridColumn: "2",
        gridRow: "3",
        acceptText: false,
      }, // Square bottom right
    ],
  },
  LAYOUT_5: {
    gridCols: 3,
    gridRows: 3,
    panels: [
      {
        ...PANEL_SIZES.PANORAMIC,
        gridColumn: GRID.FULL_WIDTH,
        gridRow: "1",
        acceptText: false,
      }, // Wide panoramic top
      {
        ...PANEL_SIZES.COLUMN,
        gridColumn: "1",
        gridRow: "2 / span 2",
        acceptText: false,
      }, // Tall portrait left
      {
        ...PANEL_SIZES.POTRAIT,
        gridColumn: "2 / span 2",
        gridRow: "2 / span 2",
        acceptText: true,
      }, // Large square right
    ],
  },
  LAYOUT_7: {
    gridCols: 1,
    gridRows: 2,
    panels: [
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: GRID.FULL_WIDTH,
        gridRow: "1",
        acceptText: true,
      }, // Portrait top right
      {
        ...PANEL_SIZES.LANDSCAPE,
        gridColumn: GRID.FULL_WIDTH,
        gridRow: "2",
        acceptText: true,
      }, // Full width landscape bottom
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
  2: ["LAYOUT_7"],
  3: ["LAYOUT_2", "LAYOUT_5"], //"LAYOUT_5"
  4: ["LAYOUT_3", "LAYOUT_4"], //, "LAYOUT_4"
};

// Helper functions for layout configuration
export const getNextLayoutType = (layoutCounter, imageCount) => {
  console.log("Getting layout for", { layoutCounter, imageCount });

  // Si pas d'images ou nombre invalide, utiliser COVER
  if (!imageCount || imageCount <= 0) {
    console.log("No images or invalid count, using COVER layout");
    return "COVER";
  }

  // Si on n'a qu'une seule image, toujours utiliser COVER
  if (imageCount === 1) {
    console.log("Single image, using COVER layout");
    return "COVER";
  }

  // Obtenir les layouts disponibles pour ce nombre d'images
  const availableLayouts = LAYOUTS_BY_PANEL_COUNT[imageCount];

  // Si on n'a pas de layout pour ce nombre d'images, utiliser COVER par défaut
  if (!availableLayouts) {
    console.warn(
      `No layout available for ${imageCount} images, falling back to COVER`
    );
    return "COVER";
  }

  // Sélectionner un layout de manière cyclique
  const layoutIndex = layoutCounter % availableLayouts.length;
  const selectedLayout = availableLayouts[layoutIndex];
  console.log(
    `Selected ${selectedLayout} for ${imageCount} images (layout counter: ${layoutCounter})`
  );
  return selectedLayout;
};

export const getLayoutDimensions = (layoutType, panelIndex) =>
  LAYOUTS[layoutType]?.panels[panelIndex];
