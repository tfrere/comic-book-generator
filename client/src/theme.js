import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    fontFamily: '"Action Man", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightRegular: 900,
    button: {
      fontFamily: '"Action Man", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 900,
    },
    body1: {
      fontWeight: 900,
    },
    body2: {
      fontWeight: 900,
    },
    caption: {
      fontWeight: 900,
    },
    h1: {
      fontWeight: 900,
    },
    h2: {
      fontWeight: 900,
    },
    h3: {
      fontWeight: 900,
    },
    h4: {
      fontWeight: 900,
    },
    h5: {
      fontWeight: 900,
    },
    h6: {
      fontWeight: 900,
    },
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          backgroundColor: "transparent",
          border: "1px solid",
          fontWeight: 900,
          fontFamily:
            '"Action Man", "Roboto", "Helvetica", "Arial", sans-serif',
          "& .MuiChip-label": {
            padding: "2px 8px",
            lineHeight: "1.2",
          },
        },
        sizeSmall: {
          height: "auto",
        },
      },
    },
  },
});
