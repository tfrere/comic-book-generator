import { IconButton, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { useNavigate } from "react-router-dom";
import { useSoundSystem } from "../contexts/SoundContext";
import { useStoryCapture } from "../hooks/useStoryCapture";
import { useRef } from "react";
import { storyApi } from "../utils/api";

const SOUND_ENABLED_KEY = "sound_enabled";

export function GameNavigation() {
  const navigate = useNavigate();
  const { isSoundEnabled, setIsSoundEnabled, playSound } = useSoundSystem();
  const { downloadStoryImage } = useStoryCapture();
  const containerRef = useRef(null);
  const location = window.location.pathname;

  const handleBack = () => {
    playSound("page");
    if (location === "/game") {
      navigate("/");
      window.location.reload();
    } else {
      navigate("/");
    }
  };

  const handleToggleSound = () => {
    const newSoundState = !isSoundEnabled;
    setIsSoundEnabled(newSoundState);
    localStorage.setItem(SOUND_ENABLED_KEY, newSoundState);
    storyApi.setSoundEnabled(newSoundState);
  };

  const handleCapture = async () => {
    playSound("page");
    const container = document.querySelector(
      "[data-comic-layout]"
    )?.parentElement;
    if (container) {
      await downloadStoryImage(
        { current: container },
        `your-story-${Date.now()}.png`
      );
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 1000 }} ref={containerRef}>
      {window.location.pathname !== "/" && (
        <Tooltip title="Back to home">
          <IconButton
            onClick={handleBack}
            size="large"
            sx={{
              position: "fixed",
              top: 24,
              left: 24,
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              },
              pointerEvents: "auto",
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* <Tooltip title="Capture story">
        <IconButton
          onClick={handleCapture}
          sx={{
            position: "fixed",
            top: 24,
            right: 88,
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            },
            pointerEvents: "auto",
          }}
        >
          <PhotoCameraOutlinedIcon />
        </IconButton>
      </Tooltip> */}

      <Tooltip title={isSoundEnabled ? "Mute sound" : "Unmute sound"}>
        <IconButton
          onClick={handleToggleSound}
          sx={{
            position: "fixed",
            size: "large",
            top: 24,
            right: 24,
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            },
            pointerEvents: "auto",
          }}
        >
          {isSoundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
        </IconButton>
      </Tooltip>
    </div>
  );
}
