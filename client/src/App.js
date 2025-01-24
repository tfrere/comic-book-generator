import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages([...messages, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:8000/chat", {
        messages: [...messages, newMessage],
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.text,
        audio: response.data.audio,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioData) => {
    const audio = new Audio(`data:audio/mpeg;base64,${audioData}`);
    audio.play();
  };

  return (
    <Container maxWidth="md" sx={{ height: "100vh", py: 4 }}>
      <Paper
        elevation={3}
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Typography
          variant="h4"
          sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
        >
          Chat avec IA
        </Typography>

        <List sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{
                flexDirection: "column",
                alignItems: message.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: "70%",
                  backgroundColor:
                    message.role === "user" ? "primary.main" : "grey.200",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <ListItemText
                  primary={message.content}
                  sx={{
                    "& .MuiListItemText-primary": {
                      color: message.role === "user" ? "white" : "black",
                    },
                  }}
                />
              </Box>
              {message.audio && (
                <IconButton
                  onClick={() => playAudio(message.audio)}
                  sx={{ mt: 1 }}
                >
                  <VolumeUpIcon />
                </IconButton>
              )}
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Tapez votre message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleSend} disabled={isLoading}>
                  <SendIcon />
                </IconButton>
              ),
            }}
          />
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
