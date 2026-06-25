import { initSteamSearch } from "./steamSearch.js";
import { initProgressBar, render } from "./progressBar.js";
import { initPreview } from "./preview.js";
import { initTheme } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSteamSearch();
  initProgressBar();
  initPreview();

  render();
});
