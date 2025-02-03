import { Box, Chip } from "@mui/material";
import { useGame } from "../contexts/GameContext";

/**
 * A component that renders text with styled words (bold, italic, etc.)
 * It automatically handles spacing between words and styled segments
 * It also removes any text enclosed in [ ] or ( )
 */
export function StyledText({ text, ...props }) {
  const { heroName } = useGame();

  if (!text || !heroName) return text;

  // Remove text enclosed in [ ] or ( )
  const cleanedText = text.replace(/\[.*?\]|\(.*?\)/g, "");

  const parts = cleanedText.split(new RegExp(`(${heroName})`, "i"));

  return (
    <Box component="span" sx={{ display: "inline", ...props.sx }}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === heroName.toLowerCase()) {
          return (
            <Chip
              key={index}
              label={part}
              size="small"
              sx={{
                mx: 0.1,
                height: "auto",
                padding: "0px 2px",
                "& .MuiChip-label": {
                  padding: "0 2px",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  fontWeight: "900",
                },
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            />
          );
        }
        return part;
      })}
    </Box>
  );
}

export default StyledText;
