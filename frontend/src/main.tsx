// Must stay first: it installs Buffer and friends before any Midnight module
// that assumes Node globals is evaluated.
import "./shims/node-globals";
import "./shims/proof-logging";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { WalletProvider } from "./wallet/WalletContext";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>
);
