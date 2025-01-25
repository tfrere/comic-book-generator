import { LAYOUTS, getNextLayoutType } from "./config";

// Function to group segments into layouts
export function groupSegmentsIntoLayouts(segments) {
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
      const layoutType = getNextLayoutType(layouts.length);
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

  return layouts;
}

// Function to get panel dimensions for next image
export function getNextPanelDimensions(segments) {
  const nonChoiceSegments = segments.filter((segment) => !segment.isChoice);

  // Si c'est le premier segment, utiliser le format COVER
  if (
    nonChoiceSegments.length === 0 ||
    (nonChoiceSegments.length === 1 && nonChoiceSegments[0].is_first_step)
  ) {
    return LAYOUTS.COVER.panels[0];
  }

  // Si c'est le dernier segment et c'est une mort ou victoire, utiliser le format COVER
  const lastSegment = nonChoiceSegments[nonChoiceSegments.length - 1];
  if (lastSegment.is_last_step) {
    return LAYOUTS.COVER.panels[0];
  }

  // Pour les segments du milieu, déterminer le layout et la position dans ce layout
  const layouts = groupSegmentsIntoLayouts(nonChoiceSegments.slice(0, -1));
  const lastLayout = layouts[layouts.length - 1];
  const segmentsInLastLayout = lastLayout ? lastLayout.segments.length : 0;

  // Déterminer le type du prochain layout
  const nextLayoutType = getNextLayoutType(layouts.length);
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
