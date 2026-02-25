// src/public/js/main.js

import { initSteamSearch } from "./steamSearch.js";
import { initProgressBar, render } from "./progressBar.js";
import { initPreview } from "./preview.js";

// Initialize all parts of the application
document.addEventListener("DOMContentLoaded", () => {
  initSteamSearch();
  initProgressBar();
  initPreview();

  // Initial render of the progress bar configuration
  render();
});
