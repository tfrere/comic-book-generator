import { useCallback } from "react";
import { useScreenshot } from "use-react-screenshot";

export function useStoryCapture() {
  const [image, takeScreenshot] = useScreenshot({
    type: "image/png",
    quality: 1.0,
  });

  const calculateOptimalWidth = (element) => {
    // Get all comic pages
    const comicPages = element.querySelectorAll("[data-comic-page]");
    if (!comicPages.length) return element.scrollWidth;

    // Get width of a single page (they all have the same width)
    const firstPage = comicPages[0];
    const pageWidth = firstPage.offsetWidth;
    const gap = 32; // Fixed gap between pages
    const padding = 32; // Fixed padding on both sides

    // Calculate total width:
    // - All pages width (pageWidth * nbPages)
    // - Gaps only between pages, so (nbPages - 1) gaps
    // - Padding on both sides
    const totalWidth =
      pageWidth * comicPages.length +
      (comicPages.length > 1 ? gap * (comicPages.length - 1) : 0) +
      padding * 2;

    console.log("Width calculation:", {
      numberOfPages: comicPages.length,
      pageWidth,
      gapBetweenPages: gap,
      totalGaps: comicPages.length > 1 ? gap * (comicPages.length - 1) : 0,
      padding,
      totalWidth,
    });

    return totalWidth;
  };

  const captureStory = useCallback(
    async (containerRef) => {
      if (!containerRef.current) return null;

      const element = containerRef.current.querySelector("[data-comic-layout]");
      if (!element) {
        console.error("Comic layout container not found");
        return null;
      }

      try {
        // Save original styles
        const originalStyle = element.style.cssText;
        const originalScroll = element.scrollLeft;
        const originalWidth = element.style.width;
        const originalPadding = element.style.padding;
        const originalGap = element.style.gap;

        // Calculate optimal width
        const optimalWidth = calculateOptimalWidth(element);

        // Reset scroll and styles temporarily for the screenshot
        Object.assign(element.style, {
          width: `${optimalWidth}px`,
          display: "flex",
          flexDirection: "row",
          gap: "32px",
          padding: "32px",
          paddingLeft: "32px !important", // Force override the dynamic padding
          paddingRight: "32px !important", // Force override the dynamic padding
          overflow: "hidden",
          transition: "none", // Disable transitions during capture
        });
        element.scrollLeft = 0;

        // Force reflow
        element.offsetHeight;

        // Take screenshot
        const result = await takeScreenshot(element, {
          backgroundColor: "#242424",
          width: optimalWidth,
          height: element.scrollHeight,
          style: {
            transform: "none",
            transition: "none",
          },
        });

        // Restore original styles
        element.style.cssText = originalStyle;
        element.style.width = originalWidth;
        element.style.padding = originalPadding;
        element.style.gap = originalGap;
        element.scrollLeft = originalScroll;

        return result;
      } catch (error) {
        console.error("Error capturing story:", error);
        return null;
      }
    },
    [takeScreenshot]
  );

  const downloadStoryImage = useCallback(
    async (containerRef, filename = "my-story.png") => {
      const image = await captureStory(containerRef);
      if (!image) return;

      const link = document.createElement("a");
      link.href = image;
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
