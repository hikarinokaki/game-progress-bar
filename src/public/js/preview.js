import { state } from "./state.js";
import { copyBtn } from "./domElements.js";
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
    titleX: state.titleX,
    titleY: state.titleY,
    timeX: state.timeX,
    timeY: state.timeY,
    barX: state.barX,
    barY: state.barY,
    orientation: state.orientation,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    titleFontSize: state.titleFontSize,
    timeFontSize: state.timeFontSize,
    todoX: state.todoX,
    todoY: state.todoY,
    todoFontSize: state.todoFontSize,
    twitchChannel: state.twitchChannel,
    twitchUsername: state.twitchUsername,
    msLabelOffsetX: state.msLabelOffsetX,
    msLabelOffsetY: state.msLabelOffsetY,
    msLabelFontSize: state.msLabelFontSize,
  });

  if (state.maskImageUrl) {
    params.set("maskImageUrl", state.maskImageUrl);
  }

  if (state.paused) {
    params.set("paused", "1");
  }

  if (state.milestones && state.milestones.length > 0) {
    params.set("milestones", JSON.stringify(state.milestones));
  }

  if (state.todos && state.todos.length > 0) {
    params.set("todos", JSON.stringify(state.todos));
  }

  return `bar.html?${params.toString()}`;
}

export function initPreview() {
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
