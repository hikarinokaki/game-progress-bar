import { getStyle } from "./registry.js";

let currentScale = 1;
let naturalPositions = {};

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
    titleX: params.get("titleX") || "",
    titleY: params.get("titleY") || "",
    timeX: params.get("timeX") || "",
    timeY: params.get("timeY") || "",
    orientation: params.get("orientation") || "horizontal",
    maskImageUrl: params.get("maskImageUrl") || "",
    canvasWidth: params.get("canvasWidth") || "1920",
    canvasHeight: params.get("canvasHeight") || "1080",
    positionMode: params.get("positionMode") === "1",
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

  const validOrientations = ["horizontal", "vertical"];
  if (!validOrientations.includes(p.orientation)) {
    p.orientation = "horizontal";
  }

  return p;
}

function initCanvas(params) {
  const canvas = document.getElementById("bar-canvas");
  const cw = parseInt(params.canvasWidth) || 1920;
  const ch = parseInt(params.canvasHeight) || 1080;

  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";

  function resize() {
    const scaleX = window.innerWidth / cw;
    const scaleY = window.innerHeight / ch;
    currentScale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${currentScale})`;
  }

  window.addEventListener("resize", resize);
  resize();
}

function captureNaturalPositions() {
  const canvas = document.getElementById("bar-canvas");
  if (!canvas) return;
  const scale = currentScale;
  const canvasRect = canvas.getBoundingClientRect();

  document.querySelectorAll("#title, #percentage").forEach((label) => {
    if (label.style.display === "none") return;
    const savedTransform = label.style.transform || "";
    if (savedTransform) label.style.transform = "none";
    const rect = label.getBoundingClientRect();
    if (savedTransform) label.style.transform = savedTransform;
    naturalPositions[label.id] = {
      x: Math.round((rect.left - canvasRect.left) / scale),
      y: Math.round((rect.top - canvasRect.top) / scale),
    };
  });
}

function applyPositions(params) {
  setElementPosition(
    document.getElementById("title"),
    params.titleX,
    params.titleY,
  );
  setElementPosition(
    document.getElementById("percentage"),
    params.timeX,
    params.timeY,
  );
}

function setElementPosition(el, x, y) {
  if (!el) return;
  if (x !== "" && y !== "") {
    const nat = naturalPositions[el.id];
    if (nat) {
      el.style.transform = `translate(${x - nat.x}px, ${y - nat.y}px)`;
    }
    el.style.margin = "0";
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
  } else {
    el.style.transform = "";
    el.style.margin = "";
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
  }
}

function setupDragEnvironment(params) {
  const canvas = document.getElementById("bar-canvas");
  if (!canvas) return;

  document.querySelectorAll("#title, #percentage").forEach((label) => {
    if (label.style.display === "none") return;
    label.style.cursor = "grab";
  });

  let dragEl = null;
  let dragStartCX = 0;
  let dragStartCY = 0;
  let dragStartTx = 0;
  let dragStartTy = 0;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) / currentScale,
      cy: (e.clientY - rect.top) / currentScale,
    };
  }

  function parseTranslate(el) {
    const m = el.style.transform.match(
      /translate\(([\d.-]+)px,\s*([\d.-]+)px\)/,
    );
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return [0, 0];
  }

  function onPointerDown(e) {
    const label = e.target.closest("#title, #percentage");
    if (!label) return;
    dragEl = label;
    const { cx, cy } = getCanvasCoords(e);
    [dragStartTx, dragStartTy] = parseTranslate(dragEl);
    dragStartCX = cx;
    dragStartCY = cy;
    dragEl.setPointerCapture(e.pointerId);
    dragEl.style.cursor = "grabbing";
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragEl) return;
    const { cx, cy } = getCanvasCoords(e);
    const tx = dragStartTx + (cx - dragStartCX);
    const ty = dragStartTy + (cy - dragStartCY);
    dragEl.style.transform = `translate(${tx}px, ${ty}px)`;
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragEl) return;
    const { cx, cy } = getCanvasCoords(e);
    const target = dragEl.id === "title" ? "title" : "time";
    const tx = Math.round(dragStartTx + (cx - dragStartCX));
    const ty = Math.round(dragStartTy + (cy - dragStartCY));

    const nat = naturalPositions[dragEl.id];
    const absX = nat ? nat.x + tx : tx;
    const absY = nat ? nat.y + ty : ty;

    dragEl.style.cursor = "grab";
    dragEl.releasePointerCapture(e.pointerId);
    dragEl = null;

    window.parent.postMessage(
      { type: "position", target, x: absX, y: absY },
      "*",
    );
  }

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);

  canvas._dragCleanup = () => {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.querySelectorAll("#title, #percentage").forEach((label) => {
      label.style.cursor = "";
    });
  };
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
  searchParams.set("titleX", params.titleX);
  searchParams.set("titleY", params.titleY);
  searchParams.set("timeX", params.timeX);
  searchParams.set("timeY", params.timeY);
  searchParams.set("orientation", params.orientation);
  searchParams.set("canvasWidth", params.canvasWidth);
  searchParams.set("canvasHeight", params.canvasHeight);

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
  } else {
    titleElement.style.display = "none";
  }
}

export function initBar() {
  const params = parseParams();

  initCanvas(params);

  setupTitle(params);

  const style = getStyle(params.style);
  const progressElement = style.init(
    document.getElementById("progressContainer"),
    params,
  );

  captureNaturalPositions();

  applyPositions(params);

  function updateProgress(value, maxValue) {
    style.update(progressElement, value, maxValue, params);
  }

  updateProgress(params.start, params.max);
  updateDisplay(params.start, params.max, params);
  updateURL(params.start, params.max, params);

  if (!params.positionMode) {
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

  window.addEventListener("message", (event) => {
    if (event.data?.type === "enable-drag") {
      const canvas = document.getElementById("bar-canvas");
      if (canvas && canvas._dragCleanup) {
        canvas._dragCleanup();
        delete canvas._dragCleanup;
      }
      setupDragEnvironment(params);
    } else if (event.data?.type === "disable-drag") {
      const canvas = document.getElementById("bar-canvas");
      if (canvas && canvas._dragCleanup) {
        canvas._dragCleanup();
        delete canvas._dragCleanup;
      }
    }
  });
}
