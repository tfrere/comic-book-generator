import { Box, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { LAYOUTS } from "./config";
import { groupSegmentsIntoLayouts } from "./utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { Panel } from "./Panel";
import { StoryChoices } from "../components/StoryChoices";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useGame } from "../contexts/GameContext";
import { useSoundEffect } from "../hooks/useSoundEffect";

// Composant pour afficher le spinner de chargement
function LoadingPage() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        aspectRatio: "0.7",
        flexShrink: 0,
      }}
    >
      <CircularProgress
        size={60}
        sx={{
          color: "white",
          opacity: 0.1,
        }}
      />
    </Box>
  );
}

// Component for displaying a page of panels
function ComicPage({ layout, layoutIndex, isLastPage, preloadedImages }) {
  const {
    handlePageLoaded,
    choices,
    onChoice,
    isLoading,
    isNarratorSpeaking,
    stopNarration,
    playNarration,
    heroName,
  } = useGame();
  const [loadedImages, setLoadedImages] = useState(new Set());
  const pageLoadedRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const totalImages = layout.segments.reduce((total, segment) => {
    return total + (segment.images?.length || 0);
  }, 0);

  // Son d'écriture
  const playWritingSound = useSoundEffect({
    basePath: "/sounds/drawing-",
    numSounds: 5,
    volume: 0.3,
  });

  const handleImageLoad = useCallback((imageId) => {
    setLoadedImages((prev) => {
      // Si l'image est déjà chargée, ne rien faire
      if (prev.has(imageId)) {
        return prev;
      }

      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    // Si la page a déjà été marquée comme chargée, ne rien faire
    if (pageLoadedRef.current) return;

    // Nettoyer le timeout précédent si existant
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Générer les IDs attendus pour cette page
    const expectedImageIds = Array.from(
      { length: totalImages },
      (_, i) => `page-${layoutIndex}-image-${i}`
    );

    // Vérifier si toutes les images de la page sont chargées
    const allImagesLoaded = expectedImageIds.every((id) =>
      loadedImages.has(id)
    );

    if (allImagesLoaded && totalImages > 0) {
      // Utiliser un timeout pour éviter les appels trop fréquents
      loadingTimeoutRef.current = setTimeout(() => {
        if (!pageLoadedRef.current) {
          console.log(`Page ${layoutIndex} entièrement chargée`);
          pageLoadedRef.current = true;
          handlePageLoaded(layoutIndex);
          playWritingSound();
        }
      }, 100);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [
    loadedImages,
    totalImages,
    layoutIndex,
    handlePageLoaded,
    playWritingSound,
  ]);

  // console.log("ComicPage layout:", {
  //   type: layout.type,
  //   totalImages,
  //   loadedImages: loadedImages.size,
  //   segments: layout.segments,
  //   isLastPage,
  //   hasChoices: choices?.length > 0,
  //   showScreenshot,
  // });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        height: "100%",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${LAYOUTS[layout.type].gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${LAYOUTS[layout.type].gridRows}, 1fr)`,
          gap: 2,
          height: "100%",
          aspectRatio: "0.7",
          backgroundColor: "white",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          borderRadius: "4px",
          p: 2,
          pb: 4,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {LAYOUTS[layout.type].panels
          .slice(0, totalImages)
          .map((panel, panelIndex) => {
            // Trouver le segment qui contient l'image pour ce panel
            let currentImageIndex = 0;
            let targetSegment = null;
            let targetImageIndex = 0;

            for (const segment of layout.segments) {
              const segmentImageCount = segment.images?.length || 0;
              if (currentImageIndex + segmentImageCount > panelIndex) {
                targetSegment = segment;
                targetImageIndex = panelIndex - currentImageIndex;
                // console.log("Found image for panel:", {
                //   panelIndex,
                //   targetImageIndex,
                //   hasImages: !!segment.images,
                //   imageCount: segment.images?.length,
                //   imageDataSample:
                //     segment.images?.[targetImageIndex]?.slice(0, 50) + "...",
                // });
                break;
              }
              currentImageIndex += segmentImageCount;
            }

            return (
              <Panel
                key={panelIndex}
                panel={panel}
                segment={targetSegment}
                panelIndex={targetImageIndex}
                totalImagesInPage={totalImages}
                onImageLoad={() =>
                  handleImageLoad(`page-${layoutIndex}-image-${panelIndex}`)
                }
                imageId={`page-${layoutIndex}-image-${panelIndex}`}
              />
            );
          })}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "black",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {layoutIndex + 1}
        </Box>
      </Box>
      {isLastPage && (
        <Box
          sx={{
            position: "absolute",
            left: "100%",
            top: "75%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "350px",
            ml: 4,
            backgroundColor: "transparent",
          }}
        >
          <StoryChoices />
        </Box>
      )}
    </Box>
  );
}

// Cache global pour stocker les images préchargées
const imageCache = new Map();

// Main comic layout component
export function ComicLayout() {
  const {
    segments,
    isLoading,
    playNarration,
    stopNarration,
    isNarratorSpeaking,
  } = useGame();
  const scrollContainerRef = useRef(null);
  const [preloadedImages, setPreloadedImages] = useState(new Map());
  const preloadingRef = useRef(false);

  const loadImage = async (imageData, imageId) => {
    // Vérifier si l'image est valide
    if (!imageData || typeof imageData !== "string" || imageData.length === 0) {
      console.warn(
        `Image invalide pour ${imageId}: données manquantes ou invalides`
      );
      return Promise.reject(new Error("Données d'image invalides"));
    }

    // Si l'image est déjà dans le cache, ne pas la recharger
    if (imageCache.has(imageId)) {
      return imageCache.get(imageId);
    }

    // Si l'image est déjà en cours de chargement, ne pas la recharger
    if (preloadingRef.current.has(imageId)) {
      return;
    }

    preloadingRef.current.add(imageId);

    try {
      const img = new Image();
      const imagePromise = new Promise((resolve, reject) => {
        img.onload = () => {
          imageCache.set(imageId, imageData);
          preloadingRef.current.delete(imageId);
          resolve(imageData);
        };
        img.onerror = (error) => {
          preloadingRef.current.delete(imageId);
          console.warn(`Échec du chargement de l'image ${imageId}`, error);
          reject(new Error(`Échec du chargement de l'image ${imageId}`));
        };
      });

      img.src = `data:image/jpeg;base64,${imageData}`;
      return await imagePromise;
    } catch (error) {
      preloadingRef.current.delete(imageId);
      throw error;
    }
  };

  // Précharger les images pour tous les segments
  useEffect(() => {
    if (!segments?.length) return;

    preloadingRef.current = new Set();
    const newPreloadedImages = new Map();

    const loadAllImages = async () => {
      for (
        let segmentIndex = 0;
        segmentIndex < segments.length;
        segmentIndex++
      ) {
        const segment = segments[segmentIndex];

        // Vérifier si le segment et ses images sont valides
        if (!segment?.images?.length) {
          console.warn(`Segment ${segmentIndex} invalide ou sans images`);
          continue;
        }

        for (
          let imageIndex = 0;
          imageIndex < segment.images.length;
          imageIndex++
        ) {
          const imageData = segment.images[imageIndex];
          const imageId = `segment-${segmentIndex}-image-${imageIndex}`;

          try {
            if (!imageData) {
              console.warn(`Image manquante: ${imageId}`);
              newPreloadedImages.set(imageId, false);
              continue;
            }

            await loadImage(imageData, imageId);
            newPreloadedImages.set(imageId, true);
          } catch (error) {
            console.warn(
              `Erreur lors du chargement de ${imageId}:`,
              error.message
            );
            newPreloadedImages.set(imageId, false);
          }
        }
      }
      setPreloadedImages(new Map(newPreloadedImages));
    };

    loadAllImages();

    return () => {
      preloadingRef.current = new Set();
    };
  }, [segments]);

  // Effect to scroll to the right when segments are loaded
  useEffect(() => {
    const loadedSegments = segments.filter((segment) => !segment.isLoading);
    const lastSegment = loadedSegments[loadedSegments.length - 1];
    const hasNewSegment = lastSegment && !lastSegment.hasBeenRead;

    if (scrollContainerRef.current && hasNewSegment) {
      // Arrêter la narration en cours
      stopNarration();

      // Scroll to the right
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: "smooth",
      });

      // Attendre que le scroll soit terminé avant de démarrer la narration
      const timeoutId = setTimeout(() => {
        if (lastSegment && lastSegment.text) {
          playNarration(lastSegment.text);
          // Marquer le segment comme lu
          lastSegment.hasBeenRead = true;
        }
      }, 500);

      return () => {
        clearTimeout(timeoutId);
        stopNarration();
      };
    }
  }, [segments, playNarration, stopNarration]);

  // Prevent back/forward navigation on trackpad horizontal scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      const max = container.scrollWidth - container.offsetWidth;
      if (
        container.scrollLeft + e.deltaX < 0 ||
        container.scrollLeft + e.deltaX > max
      ) {
        e.preventDefault();
        container.scrollLeft = Math.max(
          0,
          Math.min(max, container.scrollLeft + e.deltaX)
        );
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const loadedSegments = segments.filter((segment) => segment.text);
  const layouts = groupSegmentsIntoLayouts(loadedSegments);

  return (
    <Box
      ref={scrollContainerRef}
      data-comic-layout
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 4,
        height: "100%",
        width: "100%",
        px: layouts[0]?.type === "COVER" ? "calc(50% - (90vh * 0.5 * 0.5))" : 0,
        py: 8,
        overflowX: "auto",
        overflowY: "hidden",
        "&::-webkit-scrollbar": {
          height: "0px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "grey.800",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "grey.700",
          borderRadius: "4px",
        },
      }}
    >
      {layouts.map((layout, layoutIndex) => (
        <ComicPage
          key={layoutIndex}
          layout={layout}
          layoutIndex={layoutIndex}
          isLastPage={layoutIndex === layouts.length - 1}
          preloadedImages={preloadedImages}
        />
      ))}
      {isLoading && !layouts[layouts.length - 1]?.segments[0]?.is_last_step && (
        <LoadingPage />
      )}
    </Box>
  );
}
