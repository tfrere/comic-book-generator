import React from "react";
import { Stack, Typography, Grid } from "@mui/material";
import {
  Palette as PaletteIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  AutoFixHigh as MacGuffinIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { Metric } from "./Metric";

export const UniverseMetrics = ({
  style,
  genre,
  epoch,
  macguffin,
  color = "primary",
  showTitle = true,
}) => {
  return (
    <Stack spacing={1}>
      {showTitle && (
        <Typography variant="subtitle2" color={`${color}.main`}>
          Universe
        </Typography>
      )}
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
        <Metric
          icon={<PaletteIcon fontSize="small" />}
          label="Style"
          value={style?.name || style}
          color={color}
        />
        {style?.selected_artist && (
          <Metric
            icon={<PersonIcon fontSize="small" />}
            label="Artist"
            value={style.selected_artist}
            color={color}
          />
        )}
        <Metric
          icon={<CategoryIcon fontSize="small" />}
          label="Genre"
          value={genre}
          color={color}
        />
        <Metric
          icon={<AccessTimeIcon fontSize="small" />}
          label="Epoch"
          value={epoch}
          color={color}
        />
        <Metric
          icon={<MacGuffinIcon fontSize="small" />}
          label="MacGuffin"
          value={macguffin}
          color={color}
        />
      </Stack>
    </Stack>
  );
};
