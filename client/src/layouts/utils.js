import { LAYOUTS, getNextLayoutType } from "./config";

// Map to store layout types for each page
const pageLayoutMap = new Map();

// Function to group segments into layouts
export function groupSegmentsIntoLayouts(segments) {
  if (!segments || segments.length === 0) return [];

  const layouts = [];

  segments.forEach((segment) => {
    const imageCount = segment.images?.length || 0;

    // Si c'est le premier segment ou le dernier (mort/victoire), créer un layout COVER
    if (segment.is_first_step || segment.is_last_step) {
      layouts.push({ type: "COVER", segments: [segment] });
      return;
    }

    // Pour tous les autres segments, créer un layout adapté au nombre d'images
    const layoutType = getNextLayoutType(layouts.length, imageCount);
    layouts.push({ type: layoutType, segments: [segment] });
  });

  return layouts;
}

// Function to get panel dimensions for next image
export function getNextPanelDimensions(segments) {
  const nonChoiceSegments = segments.filter((segment) => !segment.isChoice);

  // Si c'est le premier segment ou le dernier (mort/victoire), utiliser le format COVER
  if (
    nonChoiceSegments.length === 0 ||
    (nonChoiceSegments.length === 1 && nonChoiceSegments[0].is_first_step) ||
    (nonChoiceSegments.length > 0 &&
      nonChoiceSegments[nonChoiceSegments.length - 1].is_last_step)
  ) {
    return LAYOUTS.COVER.panels[0];
  }

  // Pour les segments du milieu, déterminer le layout en fonction du nombre d'images
  const lastSegment = nonChoiceSegments[nonChoiceSegments.length - 1];
  const imageCount = lastSegment.images?.length || 0;
  const layoutType = getNextLayoutType(
    nonChoiceSegments.length - 1,
    imageCount
  );

  return LAYOUTS[layoutType].panels[0];
}

// Function to reset layout map (call this when starting a new story)
export function resetLayoutMap() {
  pageLayoutMap.clear();
}
