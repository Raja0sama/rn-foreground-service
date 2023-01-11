import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "./hooks/useTheme";
import config from "./config/index.json";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider value={config.app.theme.body.mode}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);
