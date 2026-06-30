import { getStyle } from "./registry.js";
import {
  validateColor,
  validateDisplayFormat,
  validateOrientation,
  parseMilestones,
  parseTodos,
} from "./logic.js";
import { createTimer } from "./timer.js";
import { initTwitch } from "./twitch.js";
import {
  canvasState,
  initCanvas,
  makeAbsolute,
  applyPositions,
  updateDisplay,
  renderMilestones,
  renderTodos,
  setupTitle,
} from "./render.js";
import { setupDragEnvironment, setSnapEnabled } from "./drag.js";

function parseParams() {
  const params = new URLSearchParams(window.location.search);

  const theme = params.get("theme") || "default";
  if (theme !== "default") {
    document.documentElement.setAttribute("data-theme", theme);
  }

  const p = {
    theme,
    start: parseInt(params.get("start")),
    max: parseInt(params.get("max")),
    title: params.get("title") || "",
    style: params.get("style") || "progress",
    displayFormat: params.get("displayFormat") || "percentage",
    accentColor: params.get("accentColor") || "#4CAF50",
    bgColor: params.get("bgColor") || "#ddd",
    direction: params.get("direction") || "increment",
    invertDisplay: params.get("invertDisplay") === "true",
    barWidth: params.get("barWidth") || "500",
    barHeight: params.get("barHeight") || "60",
    titleX: params.get("titleX") || "",
    titleY: params.get("titleY") || "",
    timeX: params.get("timeX") || "",
    timeY: params.get("timeY") || "",
    barX: params.get("barX") || "",
    barY: params.get("barY") || "",
    orientation: params.get("orientation") || "horizontal",
    maskImageUrl: params.get("maskImageUrl") || "",
    canvasWidth: params.get("canvasWidth") || "1920",
    canvasHeight: params.get("canvasHeight") || "1080",
    titleFontSize: params.get("titleFontSize") || "40",
    timeFontSize: params.get("timeFontSize") || "32",
    positionMode: params.get("positionMode") === "1",
    paused: params.get("paused") === "1",
    milestones: [],
    todos: [],
    todoX: params.get("todoX") || "",
    todoY: params.get("todoY") || "",
    todoFontSize: params.get("todoFontSize") || "20",
    twitchChannel: params.get("twitchChannel") || "",
    twitchUsername: params.get("twitchUsername") || "",
    msLabelOffsetX: params.get("msLabelOffsetX") || "0",
    msLabelOffsetY: params.get("msLabelOffsetY") || "4",
    msLabelFontSize: params.get("msLabelFontSize") || "14",
  };

  if (isNaN(p.start) || p.start < 0) p.start = 0;
  if (isNaN(p.max) || p.max <= 0) p.max = 100;
  if (p.start > p.max) p.start = p.max;

  p.displayFormat = validateDisplayFormat(p.displayFormat);
  p.accentColor = validateColor(p.accentColor, "#4CAF50");
  p.bgColor = validateColor(p.bgColor, "#ddd");
  p.milestones = parseMilestones(params.get("milestones"), p.max);
  p.todos = parseTodos(params.get("todos"));
  p.orientation = validateOrientation(p.orientation);

  if (!getStyle(p.style)) {
    console.warn(`Unknown style "${p.style}", falling back to "progress"`);
    p.style = "progress";
  }

  return p;
}

function updateURL(currentValue, maxValue, params) {
  const searchParams = new URLSearchParams();
  searchParams.set("start", currentValue);
  searchParams.set("max", maxValue);
  searchParams.set("title", params.title);
  searchParams.set("style", params.style);
  searchParams.set("displayFormat", params.displayFormat);
  searchParams.set("accentColor", params.accentColor);
  searchParams.set("bgColor", params.bgColor);
  searchParams.set("theme", params.theme);
  searchParams.set("direction", params.direction);
  searchParams.set("invertDisplay", params.invertDisplay.toString());
  searchParams.set("barWidth", params.barWidth);
  searchParams.set("barHeight", params.barHeight);
  searchParams.set("titleX", params.titleX);
  searchParams.set("titleY", params.titleY);
  searchParams.set("timeX", params.timeX);
  searchParams.set("timeY", params.timeY);
  searchParams.set("barX", params.barX);
  searchParams.set("barY", params.barY);
  searchParams.set("orientation", params.orientation);
  searchParams.set("canvasWidth", params.canvasWidth);
  searchParams.set("canvasHeight", params.canvasHeight);
  searchParams.set("titleFontSize", params.titleFontSize);
  searchParams.set("timeFontSize", params.timeFontSize);

  if (params.maskImageUrl) {
    searchParams.set("maskImageUrl", params.maskImageUrl);
  }

  searchParams.set("todoX", params.todoX);
  searchParams.set("todoY", params.todoY);
  searchParams.set("todoFontSize", params.todoFontSize);

  if (params.twitchChannel) {
    searchParams.set("twitchChannel", params.twitchChannel);
  }
  if (params.twitchUsername) {
    searchParams.set("twitchUsername", params.twitchUsername);
  }

  searchParams.set("msLabelOffsetX", params.msLabelOffsetX);
  searchParams.set("msLabelOffsetY", params.msLabelOffsetY);
  searchParams.set("msLabelFontSize", params.msLabelFontSize);

  if (params.paused) {
    searchParams.set("paused", "1");
  }

  if (params.milestones && params.milestones.length > 0) {
    searchParams.set("milestones", JSON.stringify(params.milestones));
  }

  if (params.todos && params.todos.length > 0) {
    searchParams.set("todos", JSON.stringify(params.todos));
  }

  const newUrl = window.location.pathname + "?" + searchParams.toString();
  history.replaceState(null, "", newUrl);
}

export function initBar() {
  const params = parseParams();

  initCanvas(params);

  setupTitle(params);

  let style = getStyle(params.style);
  const progressContainer = document.getElementById("progressContainer");
  let progressElement = style.init(progressContainer, params);
  progressContainer._barInnerElement = progressElement;

  makeAbsolute();

  applyPositions(params);

  renderMilestones(params);
  renderTodos(params);

  function updateProgress(value, maxValue) {
    style.update(progressElement, value, maxValue, params);
  }

  const timer = createTimer(params, {
    onProgressChange: (value) => {
      updateProgress(value, params.max);
      updateDisplay(value, params.max, params);
      updateURL(value, params.max, params);
    },
  });

  const twitchCallbacks = {
    setProgressValue: timer.setCurrentValue,
    renderTodos: () => renderTodos(params),
    renderMilestones: () => renderMilestones(params),
    updateURL: () => updateURL(params.start, params.max, params),
    pauseTimer: () => {
      timer.pause();
      params.paused = true;
      updateURL(timer.getCurrentValue(), params.max, params);
    },
    resumeTimer: () => {
      timer.resume();
      params.paused = false;
      updateURL(timer.getCurrentValue(), params.max, params);
    },
  };
  initTwitch(params, twitchCallbacks);

  updateProgress(params.start, params.max);
  updateDisplay(params.start, params.max, params);
  updateURL(params.start, params.max, params);

  window.addEventListener("message", (event) => {
    if (event.data?.type === "enable-drag") {
      const canvas = document.getElementById("bar-canvas");
      if (canvas && canvas._dragCleanup) {
        canvas._dragCleanup();
        delete canvas._dragCleanup;
      }
      setupDragEnvironment(params);
    } else if (event.data?.type === "snap") {
      setSnapEnabled(event.data.enabled);
    } else if (event.data?.type === "config-update") {
      const d = event.data;
      const oldStyle = params.style;
      const oldAccentColor = params.accentColor;
      const oldBgColor = params.bgColor;
      const oldBarWidth = params.barWidth;
      const oldBarHeight = params.barHeight;
      Object.assign(params, d);
      params.paused = true;

      const needsReinit =
        params.style !== oldStyle ||
        params.accentColor !== oldAccentColor ||
        params.bgColor !== oldBgColor ||
        params.barWidth !== oldBarWidth ||
        params.barHeight !== oldBarHeight;

      if (needsReinit) {
        const newStyle = getStyle(params.style);
        if (newStyle) {
          if (style.destroy) style.destroy(progressElement);
          progressContainer.innerHTML = "";
          progressElement = newStyle.init(progressContainer, params);
          progressContainer._barInnerElement = progressElement;
          style = newStyle;
        }
      }

      setupTitle(params);
      applyPositions(params);
      renderMilestones(params);
      renderTodos(params);
      timer.setCurrentValue(params.start);
    }
  });
}
