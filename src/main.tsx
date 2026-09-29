import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { spellingForLanguages } from "./spelling/spelling";
import { SpellingContext } from "./spelling/spellingContext";
import "./index.css";

// Chosen once per page load; a change of browser language takes effect on
// the next reload.
const spelling = spellingForLanguages(
  navigator.languages?.length ? navigator.languages : [navigator.language],
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpellingContext value={spelling}>
      <App />
    </SpellingContext>
  </StrictMode>,
);
