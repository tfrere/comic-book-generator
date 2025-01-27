import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { Home } from "./pages/Home";
import { Game } from "./pages/Game";
import { Tutorial } from "./pages/Tutorial";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);
