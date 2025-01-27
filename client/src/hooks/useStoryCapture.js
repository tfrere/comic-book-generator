import { useCallback } from "react";
import html2canvas from "html2canvas";

export function useStoryCapture() {
  const captureStory = useCallback(async (containerRef) => {
    if (!containerRef.current) return null;

    try {
      // Trouver le conteneur scrollable (ComicLayout)
      const scrollContainer = containerRef.current.querySelector(
        "[data-comic-layout]"
      );
      if (!scrollContainer) {
        console.error("Comic layout container not found");
        return null;
      }

      // Sauvegarder les styles et positions originaux
      const originalStyles = new Map();
      const elementsToRestore = [
        containerRef.current,
        scrollContainer,
        ...Array.from(scrollContainer.children),
      ];

      // Sauvegarder les styles originaux
      elementsToRestore.forEach((el) => {
        originalStyles.set(el, {
          style: el.style.cssText,
          scroll: { left: el.scrollLeft, top: el.scrollTop },
        });
      });

      // Obtenir les dimensions totales (sans le padding)
      const children = Array.from(scrollContainer.children);
      const lastChild = children[children.length - 1];
      const lastChildRect = lastChild.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      // Calculer la largeur totale en incluant la position et la largeur complète du dernier élément
      const totalWidth =
        lastChildRect.x + lastChildRect.width - containerRect.x + 32; // Ajouter un petit padding de sécurité

      const totalHeight = scrollContainer.scrollHeight;

      // Préparer le conteneur pour la capture
      Object.assign(containerRef.current.style, {
        width: "auto",
        height: "auto",
        overflow: "visible",
      });

      // Préparer le conteneur scrollable
      Object.assign(scrollContainer.style, {
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        position: "relative",
        overflow: "visible",
        display: "flex",
        transform: "none",
        transition: "none",
        padding: "0",
        justifyContent: "flex-start", // Forcer l'alignement à gauche
      });

      // Forcer un reflow
      scrollContainer.offsetHeight;

      // Capturer l'image
      const canvas = await html2canvas(scrollContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#242424",
        width: totalWidth,
        height: totalHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: totalWidth,
        windowHeight: totalHeight,
        logging: true,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector(
            "[data-comic-layout]"
          );
          if (clonedContainer) {
            Object.assign(clonedContainer.style, {
              width: `${totalWidth}px`,
              height: `${totalHeight}px`,
              position: "relative",
              overflow: "visible",
              display: "flex",
              transform: "none",
              transition: "none",
              padding: "0",
              justifyContent: "flex-start",
            });

            // S'assurer que tous les enfants sont visibles et alignés
            Array.from(clonedContainer.children).forEach(
              (child, index, arr) => {
                Object.assign(child.style, {
                  position: "relative",
                  transform: "none",
                  transition: "none",
                  marginLeft: "0",
                  marginRight: index < arr.length - 1 ? "16px" : "16px", // Garder une marge à droite même pour le dernier
                });
              }
            );
          }
        },
      });

      // Restaurer tous les styles originaux
      elementsToRestore.forEach((el) => {
        const original = originalStyles.get(el);
        if (original) {
          el.style.cssText = original.style;
          el.scrollLeft = original.scroll.left;
          el.scrollTop = original.scroll.top;
        }
      });

      return canvas.toDataURL("image/png", 1.0);
    } catch (error) {
      console.error("Error capturing story:", error);
      return null;
    }
  }, []);

  const downloadStoryImage = useCallback(
    async (containerRef, filename = "my-story.png") => {
      const imageUrl = await captureStory(containerRef);
      if (!imageUrl) return;

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [captureStory]
  );

  return {
    captureStory,
    downloadStoryImage,
  };
}
