import { getStyle } from "./registry.js";

function secondsToNaturalTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (remainingMinutes > 0) {
    return `${remainingMinutes}m`;
  }
  return `${remainingSeconds}s`;
}

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
    titlePosition: params.get("titlePosition") || "top",
    timePosition: params.get("timePosition") || "bottom",
    titleFontSize: params.get("titleFontSize") || "2.5em",
    orientation: params.get("orientation") || "horizontal",
    maskImageUrl: params.get("maskImageUrl") || "",
  };

  if (isNaN(p.start) || p.start < 0) p.start = 0;
  if (isNaN(p.max) || p.max <= 0) p.max = 100;
  if (p.start > p.max) p.start = p.max;

  const validFormats = ["percentage", "time", "none"];
  if (!validFormats.includes(p.displayFormat)) {
    console.warn(
      `Unknown displayFormat "${p.displayFormat}", falling back to "percentage"`,
    );
    p.displayFormat = "percentage";
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(p.accentColor)) {
    console.warn(
      `Invalid accentColor "${p.accentColor}", falling back to "#4CAF50"`,
    );
    p.accentColor = "#4CAF50";
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(p.bgColor)) {
    console.warn(`Invalid bgColor "${p.bgColor}", falling back to "#ddd"`);
    p.bgColor = "#ddd";
  }

  if (!getStyle(p.style)) {
    console.warn(`Unknown style "${p.style}", falling back to "progress"`);
    p.style = "progress";
  }

  const validTitlePositions = ["top", "bottom", "hidden"];
  if (!validTitlePositions.includes(p.titlePosition)) {
    p.titlePosition = "top";
  }

  const validTimePositions = ["top", "bottom", "hidden"];
  if (!validTimePositions.includes(p.timePosition)) {
    p.timePosition = "bottom";
  }

  const validOrientations = ["horizontal", "vertical"];
  if (!validOrientations.includes(p.orientation)) {
    p.orientation = "horizontal";
  }

  return p;
}

function updateDisplay(currentValue, maxValue, params) {
  const percentageText = document.getElementById("percentage");
  const displayVal = params.invertDisplay
    ? maxValue - currentValue
    : currentValue;

  if (params.displayFormat === "percentage") {
    const percent = Math.round((displayVal / maxValue) * 100);
    percentageText.textContent = percent + "%";
    percentageText.style.display = "block";
  } else if (params.displayFormat === "time") {
    percentageText.textContent = `${secondsToNaturalTime(displayVal)} / ${secondsToNaturalTime(maxValue)}`;
    percentageText.style.display = "block";
  } else {
    percentageText.style.display = "none";
  }
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
  searchParams.set("titlePosition", params.titlePosition);
  searchParams.set("timePosition", params.timePosition);
  searchParams.set("titleFontSize", params.titleFontSize);
  searchParams.set("orientation", params.orientation);

  if (params.maskImageUrl) {
    searchParams.set("maskImageUrl", params.maskImageUrl);
  }

  const newUrl = window.location.pathname + "?" + searchParams.toString();
  history.replaceState(null, "", newUrl);
}

function setupTitle(params) {
  const titleElement = document.getElementById("title");
  if (params.title) {
    titleElement.textContent = params.title;
    titleElement.style.display = "block";
    titleElement.style.fontSize = params.titleFontSize;
  } else {
    titleElement.style.display = "none";
  }
}

function positionElements(params) {
  const titleElement = document.getElementById("title");
  const percentageText = document.getElementById("percentage");
  const container = document.getElementById("progressContainer");

  if (params.titlePosition === "hidden") {
    titleElement.style.display = "none";
  } else if (params.title) {
    titleElement.style.display = "block";
  }

  if (params.timePosition === "hidden") {
    percentageText.style.display = "none";
  }

  const parent = container.parentNode;
  const children = Array.from(parent.children);

  if (params.titlePosition === "bottom" && params.title) {
    parent.insertBefore(container, titleElement);
  }

  if (params.timePosition === "top") {
    parent.insertBefore(percentageText, container);
  } else {
    parent.insertBefore(percentageText, container.nextSibling);
  }
}

export function initBar() {
  const params = parseParams();

  const container = document.getElementById("progressContainer");
  const titleElement = document.getElementById("title");

  setupTitle(params);

  const style = getStyle(params.style);
  const progressElement = style.init(container, params);

  positionElements(params);

  function updateProgress(value, maxValue) {
    style.update(progressElement, value, maxValue, params);
  }

  updateProgress(params.start, params.max);
  updateDisplay(params.start, params.max, params);
  updateURL(params.start, params.max, params);

  let currentValue = params.start;
  const isCountdown = params.direction === "countdown";
  const interval = setInterval(() => {
    if (isCountdown) {
      if (currentValue > 0) {
        currentValue--;
        updateProgress(currentValue, params.max);
        updateDisplay(currentValue, params.max, params);
        updateURL(currentValue, params.max, params);
      } else {
        clearInterval(interval);
      }
    } else {
      if (currentValue < params.max) {
        currentValue++;
        updateProgress(currentValue, params.max);
        updateDisplay(currentValue, params.max, params);
        updateURL(currentValue, params.max, params);
      } else {
        clearInterval(interval);
      }
    }
  }, 1000);
}
