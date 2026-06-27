import { state } from "./state.js";
import { previewBtn, copyBtn, previewFrame } from "./domElements.js";
import { getTheme } from "./theme.js";

function buildPreviewURL() {
  const params = new URLSearchParams({
    start: state.start,
    max: state.max,
    title: state.title,
    style: state.style,
    displayFormat: state.displayFormat,
    accentColor: state.accentColor,
    bgColor: state.bgColor,
    theme: getTheme(),
    direction: state.direction,
    invertDisplay: state.invertDisplay.toString(),
    barWidth: state.barWidth,
    barHeight: state.barHeight,
    titlePosition: state.titlePosition,
    timePosition: state.timePosition,
    titleFontSize: state.titleFontSize,
    orientation: state.orientation,
  });

  if (state.maskImageUrl) {
    params.set("maskImageUrl", state.maskImageUrl);
  }

  return `bar.html?${params.toString()}`;
}

export function initPreview() {
  previewBtn.addEventListener("click", () => {
    const url = buildPreviewURL();
    previewFrame.src = url;
  });

  copyBtn.addEventListener("click", async () => {
    const fullUrl = new URL(buildPreviewURL(), window.location.href).href;
    try {
      await navigator.clipboard.writeText(fullUrl);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy URL"), 1000);
    } catch {
      alert("Failed to copy.");
    }
  });
}
