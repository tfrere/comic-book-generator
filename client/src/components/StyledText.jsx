import { Typography } from "@mui/material";

/**
 * A component that renders text with styled words (bold, italic, etc.)
 * It automatically handles spacing between words and styled segments
 */
export const StyledText = ({
  text,
  variant = "body1",
  component,
  ...props
}) => {
  // Split the text into segments, preserving spaces
  const segments = text.split(/(<strong>.*?<\/strong>)/).filter(Boolean);

  return (
    <Typography variant={variant} component={component} {...props}>
      {segments.map((segment, index) => {
        if (segment.startsWith("<strong>")) {
          // Extract the text between <strong> tags and wrap it in <strong>
          const content = segment.replace(/<\/?strong>/g, "");
          return <strong key={index}>{content}</strong>;
        }
        // Return regular text segments as is
        return segment;
      })}
    </Typography>
  );
};

export default StyledText;
