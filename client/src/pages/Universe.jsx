import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/material";
import {
  Palette as PaletteIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { storyApi, universeApi } from "../utils/api";

const UniverseCard = ({ universe, imagePrompt }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateImage = async () => {
      try {
        const result = await storyApi.generateImage(imagePrompt, 512, 512);
        if (result && result.success) {
          setImageUrl(`data:image/png;base64,${result.image_base64}`);
        }
      } catch (error) {
        console.error("Error generating image:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateImage();
  }, [imagePrompt]);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ position: "relative", paddingTop: "100%" }}>
        {isLoading ? (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            component="img"
            src={imageUrl}
            alt="Universe preview"
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </Box>
      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PaletteIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontSize: "0.875rem" }}>
              {universe.style.name}
            </Typography>
          </Stack>
          {universe.style.selected_artist && (
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                {universe.style.selected_artist}
              </Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <CategoryIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
              {universe.genre}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
              {universe.epoch}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export function Universe() {
  const [universes, setUniverses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateUniverses = async () => {
      try {
        const generatedUniverses = await Promise.all(
          Array(6)
            .fill()
            .map(async () => {
              const universe = await universeApi.generate();
              return {
                ...universe,
                imagePrompt: `${
                  universe.style.selected_artist ||
                  universe.style.references[0].artist
                } style, epic wide shot of a detailed scene -- A dramatic establishing shot of a ${universe.genre.toLowerCase()} world in ${
                  universe.epoch
                }, with rich atmosphere and dynamic composition. The scene should reflect the essence of ${
                  universe.style.name
                } visual style, with appropriate lighting and mood. In the scene, Sarah is a young woman in her late twenties with short dark hair, wearing a mysterious amulet around her neck. Her blue eyes hide untold secrets.`,
              };
            })
        );
        setUniverses(generatedUniverses);
      } catch (error) {
        console.error("Error generating universes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateUniverses();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
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
        backgroundColor: "background.default",
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h4">Univers Parallèles</Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 3,
          pb: 3,
        }}
      >
        <Grid container spacing={3}>
          {universes.map((universe, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <UniverseCard
                universe={universe}
                imagePrompt={universe.imagePrompt}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default Universe;
