import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initApiConfig } from "./api/config";
import "./index.scss";
import App from "./App.tsx";

void initApiConfig().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
