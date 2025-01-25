import { LAYOUTS, getNextLayoutType } from "./config";

// Map to store layout types for each page
const pageLayoutMap = new Map();

// Function to group segments into layouts
export function groupSegmentsIntoLayouts(segments) {
  if (!segments || segments.length === 0) return [];

  const layouts = [];
  let currentLayout = null;
  let currentPanelIndex = 0;

  segments.forEach((segment) => {
    // Si c'est le premier segment ou le dernier (mort/victoire), créer un layout COVER
    if (segment.is_first_step || segment.is_last_step) {
      currentLayout = { type: "COVER", segments: [segment] };
      layouts.push(currentLayout);
      currentPanelIndex = segment.images?.length || 0;
      return;
    }

    // Si pas de layout courant ou si tous les panels sont remplis, en créer un nouveau
    if (
      !currentLayout ||
      currentPanelIndex >= LAYOUTS[currentLayout.type].panels.length
    ) {
      // Utiliser le layout existant pour cette page ou en créer un nouveau
      const pageIndex = layouts.length;
      let nextType = pageLayoutMap.get(pageIndex);
      if (!nextType) {
        nextType = getNextLayoutType(layouts.length);
        pageLayoutMap.set(pageIndex, nextType);
      }
      currentLayout = { type: nextType, segments: [] };
      layouts.push(currentLayout);
      currentPanelIndex = 0;
    }

    // Ajouter le segment au layout courant
    currentLayout.segments.push(segment);

    // Mettre à jour l'index du panel pour le prochain segment
    if (segment.images) {
      currentPanelIndex += segment.images.length;
    }
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

  // Pour les segments du milieu, déterminer le layout et la position dans ce layout
  const layouts = groupSegmentsIntoLayouts(nonChoiceSegments.slice(0, -1));
  const lastLayout = layouts[layouts.length - 1];
  const segmentsInLastLayout = lastLayout ? lastLayout.segments.length : 0;

  // Utiliser le layout existant ou en créer un nouveau
  const pageIndex = layouts.length;
  let nextLayoutType = pageLayoutMap.get(pageIndex);
  if (!nextLayoutType) {
    nextLayoutType = getNextLayoutType(layouts.length);
    pageLayoutMap.set(pageIndex, nextLayoutType);
  }
  const nextPanelIndex = segmentsInLastLayout;

  // Si le dernier layout est plein, prendre le premier panneau du prochain layout
  if (
    !lastLayout ||
    segmentsInLastLayout >= LAYOUTS[lastLayout.type].panels.length
  ) {
    return LAYOUTS[nextLayoutType].panels[0];
  }

  // Sinon, prendre le prochain panneau du layout courant
  return LAYOUTS[lastLayout.type].panels[nextPanelIndex];
}

// Function to reset layout map (call this when starting a new story)
export function resetLayoutMap() {
  pageLayoutMap.clear();
}
