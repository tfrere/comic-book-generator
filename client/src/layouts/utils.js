import { LAYOUTS, getNextLayoutType } from "./config";

// Map to store layout types for each segment
const segmentLayoutMap = new Map();

// Function to group segments into layouts
export function groupSegmentsIntoLayouts(segments) {
  if (!segments || segments.length === 0) return [];

  const layouts = [];

  segments.forEach((segment, index) => {
    const imageCount = segment.images?.length || 0;

    // Si c'est le premier segment ou le dernier (mort/victoire), créer un layout COVER
    if (segment.is_first_step || segment.is_last_step) {
      layouts.push({ type: "COVER", segments: [segment] });
      return;
    }

    // Pour tous les autres segments, utiliser le layout existant ou en créer un nouveau
    let layoutType = segmentLayoutMap.get(segment.text);
    if (!layoutType) {
      layoutType = getNextLayoutType(layouts.length, imageCount);
      segmentLayoutMap.set(segment.text, layoutType);
    }
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

  // Pour les segments du milieu, utiliser le layout existant ou en créer un nouveau
  const lastSegment = nonChoiceSegments[nonChoiceSegments.length - 1];
  const imageCount = lastSegment.images?.length || 0;
  let layoutType = segmentLayoutMap.get(lastSegment.text);
  if (!layoutType) {
    layoutType = getNextLayoutType(nonChoiceSegments.length - 1, imageCount);
    segmentLayoutMap.set(lastSegment.text, layoutType);
  }

  return LAYOUTS[layoutType].panels[0];
}

// Function to reset layout map (call this when starting a new story)
export function resetLayoutMap() {
  segmentLayoutMap.clear();
}
