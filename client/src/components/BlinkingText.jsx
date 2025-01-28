import { Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { styled } from "@mui/material/styles";

const blink = keyframes`
  0% { opacity: 1; }
  49% { opacity: 1; }
  50% { opacity: 0; }
  99% { opacity: 0; }
  100% { opacity: 1; }
`;

const BlinkingTypography = styled(Typography)`
  animation: ${blink} 1.2s infinite steps(1);
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: white;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
`;

export const BlinkingText = ({ children, ...props }) => {
  const [firstWord, secondWord] = children.split(" ");
  return (
    <BlinkingTypography {...props}>
      <span>{firstWord}</span>
      <span>{secondWord}</span>
    </BlinkingTypography>
  );
};

export default BlinkingText;
