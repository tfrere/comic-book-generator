import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storyApi } from "../utils/api";
import { useGameSession } from "../hooks/useGameSession";
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Grid,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Timer as TimerIcon,
  LocationOn as LocationIcon,
  Psychology as PsychologyIcon,
  History as HistoryIcon,
  Image as ImageIcon,
  TextFields as TextFieldsIcon,
  List as ListIcon,
  Palette as PaletteIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { DebugConsole } from "../components/DebugConsole";
import { Metric } from "../components/Metric";
import { UniverseView } from "../components/UniverseView";
import { UniverseMetrics } from "../components/UniverseMetrics";

const Debug = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [expandedPanel, setExpandedPanel] = useState("current");
  const [isLoading, setIsLoading] = useState(false);
  const historyContainerRef = React.useRef(null);

  const {
    sessionId,
    universe,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useGameSession();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Initialize game
  const initializeGame = async () => {
    try {
      setIsLoading(true);
      const response = await storyApi.start(sessionId);

      // Construire l'entrée d'historique initiale
      const initialHistoryEntry = {
        segment: response.story_text,
        player_choice: null,
        available_choices: response.choices.map((choice) => choice.text),
        time: response.time,
        location: response.location,
        previous_choice: response.previous_choice,
      };

      setGameState({
        universe_style: universe?.style,
        universe_genre: universe?.genre,
        universe_epoch: universe?.epoch,
        universe_macguffin: universe?.macguffin,
        universe_selected_artist: universe?.style?.selected_artist,
        story_beat: 0,
        story_history: [initialHistoryEntry],
      });
      setCurrentStory(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Make a choice
  const makeChoice = async (choiceIndex) => {
    try {
      setIsLoading(true);
      const response = await storyApi.makeChoice(choiceIndex + 1, sessionId);
      setCurrentStory(response);

      // Construire l'entrée d'historique
      const historyEntry = {
        segment: response.story_text,
        player_choice: currentStory.choices[choiceIndex].text,
        available_choices: currentStory.choices.map((choice) => choice.text),
        time: response.time,
        location: response.location,
        previous_choice: response.previous_choice,
      };

      setGameState((prev) => ({
        ...prev,
        story_history: [...(prev.story_history || []), historyEntry],
        story_beat: (prev.story_beat || 0) + 1,
        universe_macguffin: prev.universe_macguffin,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && !isSessionLoading && !gameState) {
      initializeGame();
    }
  }, [sessionId, isSessionLoading, gameState]);

  // Ajout de l'effet pour le défilement automatique
  useEffect(() => {
    if (historyContainerRef.current && gameState?.story_history?.length > 0) {
      historyContainerRef.current.scrollTop =
        historyContainerRef.current.scrollHeight;
    }
  }, [gameState?.story_history]);

  // Render history entries
  const renderHistoryEntry = (entry, idx) => (
    <Box
      key={idx}
      sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
    >
      <Stack spacing={1}>
        {/* Previous Choice (if any) */}
        {entry.previous_choice && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <ArrowForwardIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
              Choix précédent : {entry.previous_choice}
            </Typography>
          </Box>
        )}

        {/* Time and Location */}
        <Box sx={{ display: "flex", gap: 2, color: "text.secondary" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <TimerIcon fontSize="small" />
            <Typography variant="body2">{entry.time}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationIcon fontSize="small" />
            <Typography variant="body2">{entry.location}</Typography>
          </Box>
        </Box>

        {/* Story Text */}
        <Typography>{entry.segment}</Typography>

        {/* Available Choices */}
        {entry.available_choices && entry.available_choices.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Choix disponibles :
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
              {entry.available_choices.map((choice, choiceIdx) => (
                <Chip
                  key={choiceIdx}
                  label={choice}
                  size="small"
                  color={choice === entry.player_choice ? "primary" : "default"}
                  variant={
                    choice === entry.player_choice ? "filled" : "outlined"
                  }
                />
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );

  if (error || sessionError) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              Restart
            </Button>
          }
        >
          {error || sessionError}
        </Alert>
      </Box>
    );
  }

  if (isSessionLoading || !gameState) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "background.default",
      }}
    >
      {/* Header - plus compact */}
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderBottom: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <BugReportIcon color="primary" />
        <Typography variant="h6" component="h1">
          Debug Mode
        </Typography>
        <Tooltip title="Restart">
          <IconButton onClick={() => window.location.reload()} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ ml: "auto" }}>
          <Tab icon={<PsychologyIcon />} label="Current State" />
          <Tab icon={<PaletteIcon />} label="Universe" />
          <Tab icon={<BugReportIcon />} label="Debug" />
        </Tabs>
      </Box>

      {/* Content - scrollable */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {/* Current State Tab */}
        {currentTab === 0 && currentStory && (
          <Stack spacing={2}>
            {/* Universe Info & Game State */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: "background.paper",
              }}
            >
              <Grid container spacing={2}>
                {/* Universe Info */}
                <Grid item xs={12} md={6}>
                  <UniverseMetrics
                    style={gameState.universe_style}
                    genre={gameState.universe_genre}
                    epoch={gameState.universe_epoch}
                    macguffin={gameState.universe_macguffin}
                  />
                </Grid>

                {/* Game State */}
                <Grid item xs={12} md={6}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="secondary.main">
                      Game State
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: currentStory.is_victory
                          ? "success.dark"
                          : currentStory.is_death
                          ? "error.dark"
                          : "background.paper",
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Stack spacing={2}>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Metric
                            icon={<TimerIcon fontSize="small" />}
                            label="Time"
                            value={currentStory.time}
                            color="secondary"
                          />
                          <Metric
                            icon={<LocationIcon fontSize="small" />}
                            label="Location"
                            value={currentStory.location}
                            color="secondary"
                          />
                          <Metric
                            icon={<PsychologyIcon fontSize="small" />}
                            label="Story Beat"
                            value={gameState.story_beat}
                            color="secondary"
                          />
                        </Stack>
                        <Stack spacing={1}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: "primary.main",
                                animation: "pulse 1.5s infinite",
                                "@keyframes pulse": {
                                  "0%": {
                                    transform: "scale(.95)",
                                    boxShadow:
                                      "0 0 0 0 rgba(144, 202, 249, 0.7)",
                                  },
                                  "70%": {
                                    transform: "scale(1)",
                                    boxShadow:
                                      "0 0 0 6px rgba(144, 202, 249, 0)",
                                  },
                                  "100%": {
                                    transform: "scale(.95)",
                                    boxShadow: "0 0 0 0 rgba(144, 202, 249, 0)",
                                  },
                                },
                              }}
                            />
                            <Typography
                              variant="subtitle2"
                              sx={{ color: "primary.main" }}
                            >
                              Story in Progress
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 0.5,
                                borderRadius: 1,
                                backgroundColor: currentStory.is_death
                                  ? "error.dark"
                                  : "background.paper",
                                border: 1,
                                borderColor: "divider",
                                minWidth: 100,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: currentStory.is_death
                                    ? "white"
                                    : "text.secondary",
                                }}
                              >
                                Death: {currentStory.is_death ? "Yes" : "No"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 0.5,
                                borderRadius: 1,
                                backgroundColor: currentStory.is_victory
                                  ? "success.dark"
                                  : "background.paper",
                                border: 1,
                                borderColor: "divider",
                                minWidth: 100,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: currentStory.is_victory
                                    ? "white"
                                    : "text.secondary",
                                }}
                              >
                                Victory:{" "}
                                {currentStory.is_victory ? "Yes" : "No"}
                              </Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Story and Choices Row */}
            <Grid container spacing={2}>
              {/* Story Content */}
              <Grid item xs={12} md={8}>
                <Paper variant="outlined">
                  <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                    <Typography variant="subtitle2">Story</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, backgroundColor: "background.default" }}>
                    <Typography variant="body2">
                      {currentStory.story_text}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Interactive Choices */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined">
                  <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                    <Typography variant="subtitle2">
                      Available Choices
                    </Typography>
                  </Box>
                  <Stack spacing={1} sx={{ p: 1.5 }}>
                    {currentStory.choices && currentStory.choices.length > 0 ? (
                      currentStory.choices.map((choice, idx) => (
                        <Button
                          key={idx}
                          variant="contained"
                          color="primary"
                          onClick={() => makeChoice(idx)}
                          disabled={isLoading}
                          sx={{ mt: 1 }}
                          endIcon={
                            isLoading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <ArrowForwardIcon />
                            )
                          }
                        >
                          {choice.text}
                        </Button>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No choices available
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Story History */}
            <Paper variant="outlined">
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <HistoryIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">Story History</Typography>
              </Box>
              <Box
                ref={historyContainerRef}
                sx={{
                  maxHeight: "300px",
                  overflow: "auto",
                  scrollBehavior: "smooth",
                }}
              >
                {gameState.story_history.length > 0 ? (
                  gameState.story_history.map((entry, idx) =>
                    renderHistoryEntry(entry, idx)
                  )
                ) : (
                  <Box sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No history available
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Image Prompts */}
            <Paper variant="outlined">
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="subtitle2">Image Prompts</Typography>
              </Box>
              <Stack spacing={1} sx={{ p: 1.5 }}>
                {currentStory.image_prompts.map((prompt, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1,
                      backgroundColor: "background.default",
                      borderRadius: 1,
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "monospace",
                        color: "text.secondary",
                        display: "flex",
                        gap: 1,
                      }}
                    >
                      <Typography
                        component="span"
                        variant="caption"
                        color="primary.main"
                      >
                        {idx + 1}.
                      </Typography>
                      {prompt}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* Universe Tab */}
        {currentTab === 1 && <UniverseView universe={universe} />}

        {/* Debug Tab */}
        {currentTab === 2 && (
          <DebugConsole gameState={gameState} currentStory={currentStory} />
        )}
      </Box>
    </Box>
  );
};

export default Debug;
