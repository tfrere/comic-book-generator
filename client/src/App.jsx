import { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");
    setChatHistory((prev) => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:8000/chat", {
        message: userMessage,
      });

      setChatHistory((prev) => [
        ...prev,
        { text: response.data.response, isUser: false },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setChatHistory((prev) => [
        ...prev,
        { text: "Désolé, une erreur s'est produite.", isUser: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper
        elevation={3}
        sx={{ height: "80vh", display: "flex", flexDirection: "column", p: 2 }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Chat with AI
        </Typography>

        <List sx={{ flexGrow: 1, overflow: "auto", mb: 2 }}>
          {chatHistory.map((msg, index) => (
            <ListItem
              key={index}
              sx={{ justifyContent: msg.isUser ? "flex-end" : "flex-start" }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: "70%",
                  bgcolor: msg.isUser ? "primary.light" : "grey.100",
                  color: msg.isUser ? "white" : "text.primary",
                }}
              >
                <ListItemText primary={msg.text} />
              </Paper>
            </ListItem>
          ))}
        </List>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", gap: 1 }}
        >
          <TextField
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            disabled={isLoading}
            variant="outlined"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            endIcon={<SendIcon />}
          >
            Envoyer
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
