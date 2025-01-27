import { useCallback } from "react";
import { useScreenshot } from "use-react-screenshot";

export function useStoryCapture() {
  const [image, takeScreenshot] = useScreenshot({
    type: "image/png",
    quality: 1.0,
  });

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

        // Reset scroll and padding temporarily for the screenshot
        Object.assign(element.style, {
          paddingLeft: "0",
          paddingRight: "0",
          width: `${element.scrollWidth - 350}px`, // Reduce width by choices panel
          display: "flex",
          flexDirection: "row",
          gap: "32px",
          padding: "32px",
          overflow: "hidden",
        });
        element.scrollLeft = 0;

        // Force reflow
        element.offsetHeight;

        // Take screenshot
        const result = await takeScreenshot(element, {
          backgroundColor: "#242424",
          width: element.offsetWidth,
          height: element.scrollHeight,
          style: {
            transform: "none",
            transition: "none",
          },
        });

        // Restore original styles
        element.style.cssText = originalStyle;
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
