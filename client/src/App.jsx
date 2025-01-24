import { useState, useEffect, useRef } from "react";
import {
  Container,
  Paper,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";

// Get API URL from environment or default to localhost in development
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [storySegments, setStorySegments] = useState([]);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const isInitializedRef = useRef(false);

  const generateImageForStory = async (storyText) => {
    try {
      console.log("Generating image for story:", storyText);
      const response = await axios.post(`${API_URL}/api/generate-image`, {
        prompt: `Comic book style scene: ${storyText}`,
        width: 512,
        height: 512,
      });

      console.log("Image generation response:", response.data);

      if (response.data.success) {
        console.log("Image URL length:", response.data.image_base64.length);
        return response.data.image_base64;
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const handleStoryAction = async (action, choiceId = null) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: action,
        choice_id: choiceId,
      });

      // Générer l'image pour ce segment
      const imageUrl = await generateImageForStory(response.data.story_text);
      console.log(
        "Generated image URL:",
        imageUrl ? "Image received" : "No image"
      );

      if (action === "restart") {
        setStorySegments([
          {
            text: response.data.story_text,
            isChoice: false,
            isDeath: response.data.is_death,
            imageUrl: imageUrl,
          },
        ]);
      } else {
        setStorySegments((prev) => [
          ...prev,
          {
            text: response.data.story_text,
            isChoice: false,
            isDeath: response.data.is_death,
            imageUrl: imageUrl,
          },
        ]);
      }

      setCurrentChoices(response.data.choices);
    } catch (error) {
      console.error("Error:", error);
      setStorySegments((prev) => [
        ...prev,
        { text: "Connection lost with the storyteller...", isChoice: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start the story when the component mounts
  useEffect(() => {
    if (!isInitializedRef.current) {
      handleStoryAction("restart");
      isInitializedRef.current = true;
    }
  }, []); // Empty dependency array since we're using a ref

  const handleChoice = async (choiceId) => {
    // Add the chosen option to the story
    setStorySegments((prev) => [
      ...prev,
      {
        text: currentChoices.find((c) => c.id === choiceId).text,
        isChoice: true,
      },
    ]);
    // Continue the story with this choice
    await handleStoryAction("choice", choiceId);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper
        elevation={3}
        sx={{ height: "80vh", display: "flex", flexDirection: "column", p: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            Echoes of Influence
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={() => handleStoryAction("restart")}
            disabled={isLoading}
          >
            Restart
          </Button>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        <List sx={{ flexGrow: 1, overflow: "auto", mb: 2 }}>
          {storySegments.map((segment, index) => (
            <ListItem
              key={index}
              sx={{
                justifyContent: segment.isChoice ? "flex-end" : "flex-start",
                display: "flex",
                flexDirection: "column",
                alignItems: segment.isChoice ? "flex-end" : "flex-start",
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: "80%",
                  bgcolor: segment.isDeath
                    ? "error.light"
                    : segment.isChoice
                    ? "primary.light"
                    : "grey.100",
                  color:
                    segment.isDeath || segment.isChoice
                      ? "white"
                      : "text.primary",
                }}
              >
                <ListItemText
                  primary={
                    segment.isDeath
                      ? "DEATH"
                      : segment.isChoice
                      ? "Your Choice"
                      : "Story"
                  }
                  secondary={segment.text}
                  primaryTypographyProps={{
                    variant: "subtitle2",
                    color: segment.isChoice ? "inherit" : "primary",
                  }}
                />
                {!segment.isChoice && segment.imageUrl && (
                  <Box sx={{ mt: 2, width: "100%", textAlign: "center" }}>
                    <img
                      src={segment.imageUrl}
                      alt="Story scene"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: "4px",
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </ListItem>
          ))}
        </List>

        {currentChoices.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            {currentChoices.map((choice) => (
              <Button
                key={choice.id}
                variant="contained"
                onClick={() => handleChoice(choice.id)}
                disabled={isLoading}
                sx={{ minWidth: "200px" }}
              >
                {choice.text}
              </Button>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App;
