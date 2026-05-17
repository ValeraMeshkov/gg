import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initApiConfig } from "./api/config";
import { AuthProvider } from "./context/AuthContext";
import "./index.scss";
import App from "./App.tsx";
import { AppAssetGate } from "./pwa/AppAssetGate";
import { PwaShell } from "./pwa/PwaShell";

const isBakeSpin =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has("bakeSpin");

if (isBakeSpin) {
  void import("./dev/bakeSpinBootstrap.tsx");
} else {
  void initApiConfig().then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <AuthProvider>
          <AppAssetGate>
            <App />
          </AppAssetGate>
          <PwaShell />
        </AuthProvider>
      </StrictMode>
    );
  });
}
