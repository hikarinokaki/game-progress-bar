import { getStyle } from "./registry.js";
import tmi from "tmi.js";

let currentScale = 1;

const SNAP_THRESHOLD = 16;
const RELEASE_THRESHOLD = 28;
let snapEnabled = false;
let snappedX = { active: false, snapValue: 0 };
let snappedY = { active: false, snapValue: 0 };

let boxSelectOrigin = null;
let boxSelectActive = false;
const BOX_SELECT_THRESHOLD = 4;

function rectsIntersect(a, b) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

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
    barX: params.get("barX") || "",
    barY: params.get("barY") || "",
    orientation: params.get("orientation") || "horizontal",
    maskImageUrl: params.get("maskImageUrl") || "",
    canvasWidth: params.get("canvasWidth") || "1920",
    canvasHeight: params.get("canvasHeight") || "1080",
    titleFontSize: params.get("titleFontSize") || "40",
    timeFontSize: params.get("timeFontSize") || "32",
    positionMode: params.get("positionMode") === "1",
    milestones: [],
    todos: [],
    todoX: params.get("todoX") || "",
    todoY: params.get("todoY") || "",
    todoFontSize: params.get("todoFontSize") || "20",
    twitchChannel: params.get("twitchChannel") || "",
    twitchUsername: params.get("twitchUsername") || "",
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

  try {
    const raw = params.get("milestones");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        p.milestones = parsed
          .map((m) => ({
            seconds: Math.min(Math.max(0, Number(m.seconds) || 0), p.max),
            text: String(m.text || ""),
          }))
          .filter((m) => m.seconds > 0 || m.text);
      }
    }
  } catch {
    // invalid milestones param, ignore
  }

  try {
    const raw = params.get("todos");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        p.todos = parsed
          .map((t) => ({
            text: String(t.text || ""),
            done: !!t.done,
          }))
          .filter((t) => t.text);
      }
    }
  } catch {
    // invalid todos param, ignore
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

function makeAbsolute() {
  const canvas = document.getElementById("bar-canvas");
  if (!canvas) return;
  const scale = currentScale;
  const canvasRect = canvas.getBoundingClientRect();

  document
    .querySelectorAll("#title, #percentage, #progressContainer, #todoContainer")
    .forEach((label) => {
      if (label.style.display === "none") return;
      const savedTransform = label.style.transform || "";
      if (savedTransform) label.style.transform = "none";
      const rect = label.getBoundingClientRect();
      if (savedTransform) label.style.transform = savedTransform;
      const absX = Math.round((rect.left - canvasRect.left) / scale);
      const absY = Math.round((rect.top - canvasRect.top) / scale);
      label.style.position = "absolute";
      label.style.left = absX + "px";
      label.style.top = absY + "px";
      label.style.margin = "0";
      label.style.transform = "";
    });
}

function applyFontSizes(params) {
  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.style.fontSize = params.titleFontSize + "px";
  }
  const percEl = document.getElementById("percentage");
  if (percEl) {
    percEl.style.fontSize = params.timeFontSize + "px";
  }
  const todoContainer = document.getElementById("todoContainer");
  if (todoContainer) {
    todoContainer.style.setProperty(
      "--todo-font-size",
      params.todoFontSize + "px",
    );
  }
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
  setElementPosition(
    document.getElementById("progressContainer"),
    params.barX,
    params.barY,
  );
  setElementPosition(
    document.getElementById("todoContainer"),
    params.todoX,
    params.todoY,
  );
  applyFontSizes(params);
}

function setElementPosition(el, x, y) {
  if (!el) return;
  if (x !== "" && y !== "") {
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.margin = "0";
    el.style.transform = "";
  }
}

function getElementCanvasSize(el) {
  const rect = el.getBoundingClientRect();
  return {
    w: rect.width / currentScale,
    h: rect.height / currentScale,
  };
}

function getBarCanvasBounds(params) {
  const barEl = document.getElementById("progressContainer");
  const left = barEl ? parseInt(barEl.style.left) || 0 : 0;
  const top = barEl ? parseInt(barEl.style.top) || 0 : 0;
  const w = parseInt(params.barWidth) || 500;
  const h = parseInt(params.barHeight) || 60;
  return {
    left,
    top,
    right: left + w,
    bottom: top + h,
    cx: left + w / 2,
    cy: top + h / 2,
  };
}

function getCanvasBounds(params) {
  const w = parseInt(params.canvasWidth) || 1920;
  const h = parseInt(params.canvasHeight) || 1080;
  return { width: w, height: h, cx: w / 2, cy: h / 2 };
}

function getSnapCandidates(elId, elSize, params) {
  const candidates = [];
  const bar = getBarCanvasBounds(params);
  const canvas = getCanvasBounds(params);

  if (elId === "progressContainer") {
    candidates.push({ axis: "x", value: 0 });
    candidates.push({ axis: "x", value: canvas.width - elSize.w });
    candidates.push({ axis: "x", value: canvas.cx - elSize.w / 2 });
    candidates.push({ axis: "y", value: 0 });
    candidates.push({ axis: "y", value: canvas.height - elSize.h });
    candidates.push({ axis: "y", value: canvas.cy - elSize.h / 2 });
  } else {
    candidates.push({ axis: "x", value: bar.left });
    candidates.push({ axis: "x", value: bar.right - elSize.w });
    candidates.push({ axis: "x", value: bar.cx - elSize.w / 2 });
    candidates.push({ axis: "x", value: 0 });
    candidates.push({ axis: "x", value: canvas.width - elSize.w });
    candidates.push({ axis: "x", value: canvas.cx - elSize.w / 2 });
    candidates.push({ axis: "y", value: bar.top });
    candidates.push({ axis: "y", value: bar.bottom - elSize.h });
    candidates.push({ axis: "y", value: bar.cy - elSize.h / 2 });
    candidates.push({ axis: "y", value: 0 });
    candidates.push({ axis: "y", value: canvas.height - elSize.h });
    candidates.push({ axis: "y", value: canvas.cy - elSize.h / 2 });
  }

  return candidates;
}

function applySnapAbs(
  elId,
  intendedAbsX,
  intendedAbsY,
  params,
  startAbsX,
  startAbsY,
  elSize,
) {
  const candidates = getSnapCandidates(elId, elSize, params);

  function closestCandidate(axis, intendedVal, startVal) {
    let closest = null;
    let closestDist = Infinity;
    for (const c of candidates) {
      if (c.axis !== axis) continue;
      if (Math.abs(c.value - startVal) <= SNAP_THRESHOLD) continue;
      const dist = Math.abs(intendedVal - c.value);
      if (dist < closestDist) {
        closestDist = dist;
        closest = c;
      }
    }
    return closest;
  }

  if (snappedX.active) {
    if (Math.abs(intendedAbsX - snappedX.snapValue) > RELEASE_THRESHOLD) {
      snappedX.active = false;
    }
  }
  if (!snappedX.active) {
    const closest = closestCandidate("x", intendedAbsX, startAbsX);
    if (closest && Math.abs(intendedAbsX - closest.value) <= SNAP_THRESHOLD) {
      snappedX.active = true;
      snappedX.snapValue = closest.value;
    }
  }

  if (snappedY.active) {
    if (Math.abs(intendedAbsY - snappedY.snapValue) > RELEASE_THRESHOLD) {
      snappedY.active = false;
    }
  }
  if (!snappedY.active) {
    const closest = closestCandidate("y", intendedAbsY, startAbsY);
    if (closest && Math.abs(intendedAbsY - closest.value) <= SNAP_THRESHOLD) {
      snappedY.active = true;
      snappedY.snapValue = closest.value;
    }
  }

  const absX = snappedX.active ? snappedX.snapValue : intendedAbsX;
  const absY = snappedY.active ? snappedY.snapValue : intendedAbsY;

  return [absX, absY];
}

function clearSnapGuides() {
  const svg = document.getElementById("snap-guides");
  if (svg) svg.replaceChildren();
}

function updateSnapGuides(params) {
  const svg = document.getElementById("snap-guides");
  if (!svg) return;
  svg.replaceChildren();

  const cw = parseInt(params.canvasWidth) || 1920;
  const ch = parseInt(params.canvasHeight) || 1080;

  function drawLine(x1, y1, x2, y2, stroke, dash) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", "1");
    line.setAttribute("stroke-dasharray", dash);
    svg.appendChild(line);
  }

  // Bar center reference lines (subtle)
  const bar = getBarCanvasBounds(params);
  drawLine(bar.cx, 0, bar.cx, ch, "rgba(79,195,247,0.15)", "4 4");
  drawLine(0, bar.cy, cw, bar.cy, "rgba(79,195,247,0.15)", "4 4");

  // Active snap lines (bright)
  if (snappedX.active) {
    drawLine(snappedX.snapValue, 0, snappedX.snapValue, ch, "#4FC3F7", "6 4");
  }

  if (snappedY.active) {
    drawLine(0, snappedY.snapValue, cw, snappedY.snapValue, "#4FC3F7", "6 4");
  }
}

const selectedElements = new Set();

function clearSelection() {
  removeAllHandles();
  for (const el of selectedElements) {
    el.classList.remove("selected");
  }
  selectedElements.clear();
}

function selectSingle(el) {
  clearSelection();
  selectedElements.add(el);
  el.classList.add("selected");
  addHandles(el);
}

function toggleSelection(el) {
  if (selectedElements.has(el)) {
    selectedElements.delete(el);
    el.classList.remove("selected");
    removeHandles(el);
  } else {
    selectedElements.add(el);
    el.classList.add("selected");
    addHandles(el);
  }
}

const CORNER_THRESHOLD = 12;
const RESIZE_MIN = 20;

function getElementCanvasRect(el) {
  const canvasEl = document.getElementById("bar-canvas");
  const canvasRect = canvasEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    left: (rect.left - canvasRect.left) / currentScale,
    top: (rect.top - canvasRect.top) / currentScale,
    right: (rect.right - canvasRect.left) / currentScale,
    bottom: (rect.bottom - canvasRect.top) / currentScale,
    width: rect.width / currentScale,
    height: rect.height / currentScale,
    cx: (rect.left + rect.width / 2 - canvasRect.left) / currentScale,
    cy: (rect.top + rect.height / 2 - canvasRect.top) / currentScale,
  };
}

function getCorner(el, cx, cy) {
  const cr = getElementCanvasRect(el);
  const corners = {
    nw: { x: cr.left, y: cr.top },
    ne: { x: cr.right, y: cr.top },
    sw: { x: cr.left, y: cr.bottom },
    se: { x: cr.right, y: cr.bottom },
  };
  for (const [name, pos] of Object.entries(corners)) {
    const dx = cx - pos.x;
    const dy = cy - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) <= CORNER_THRESHOLD) return name;
  }
  return null;
}

function isTextElement(el) {
  return (
    el.id === "title" || el.id === "percentage" || el.id === "todoContainer"
  );
}

function parsePosition(el) {
  const left = parseInt(el.style.left) || 0;
  const top = parseInt(el.style.top) || 0;
  return [left, top];
}

function addHandles(el) {
  if (!el) return;
  const corners = ["nw", "ne", "sw", "se"];
  const half = 7; // half of handle size (14)
  const pos = {
    nw: { top: -half + "px", left: -half + "px" },
    ne: { top: -half + "px", right: -half + "px" },
    sw: { bottom: -half + "px", left: -half + "px" },
    se: { bottom: -half + "px", right: -half + "px" },
  };
  for (const c of corners) {
    const div = document.createElement("div");
    div.className = "resize-handle";
    div.dataset.corner = c;
    const p = pos[c];
    for (const [prop, val] of Object.entries(p)) {
      div.style[prop] = val;
    }
    el.appendChild(div);
  }
}

function removeHandles(el) {
  if (!el) return;
  el.querySelectorAll(".resize-handle").forEach((h) => h.remove());
}

function removeAllHandles() {
  for (const el of selectedElements) {
    removeHandles(el);
  }
}

function setupDragEnvironment(params) {
  const canvas = document.getElementById("bar-canvas");
  if (!canvas) return;

  const TARGETS = "#title, #percentage, #progressContainer, #todoContainer";

  document.querySelectorAll(TARGETS).forEach((label) => {
    if (label.style.display === "none") return;
    label.style.cursor = "grab";
  });

  let dragEl = null;
  let dragStartCX = 0;
  let dragStartCY = 0;
  let dragStartAbsX = 0;
  let dragStartAbsY = 0;
  let draggedElements = [];
  const dragStartAbsPos = new Map();

  let resizeEl = null;
  let resizeCorner = null;
  let resizeStartData = {};
  let resizeCX = 0;
  let resizeCY = 0;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      cx: (e.clientX - rect.left) / currentScale,
      cy: (e.clientY - rect.top) / currentScale,
    };
  }

  function setCursorForTarget(el, cx, cy) {
    if (!el || el.style.display === "none") {
      canvas.style.cursor = "";
      return;
    }
    const corner = getCorner(el, cx, cy);
    if (corner) {
      canvas.style.cursor =
        corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
    } else {
      canvas.style.cursor = "";
    }
  }

  function onPointerDown(e) {
    const { cx, cy } = getCanvasCoords(e);
    const label = e.target.closest(TARGETS);

    // Click on empty space → start box select
    if (!label) {
      boxSelectOrigin = { cx, cy };
      return;
    }

    // Ctrl/Meta+click → toggle selection, never drag
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(label);
      return;
    }

    // Check for corner resize on selected elements
    if (selectedElements.has(label)) {
      const corner = getCorner(label, cx, cy);
      if (corner) {
        resizeEl = label;
        resizeCorner = corner;
        resizeCX = cx;
        resizeCY = cy;

        const cr = getElementCanvasRect(label);

        if (isTextElement(label)) {
          let currentFontSize;
          if (label.id === "todoContainer") {
            currentFontSize = parseInt(params.todoFontSize) || 20;
          } else {
            currentFontSize = parseInt(
              label.style.fontSize || (label.id === "title" ? "40" : "32"),
            );
          }
          resizeStartData = {
            type: "text",
            startFontSize: currentFontSize,
            centerX: cr.cx,
            centerY: cr.cy,
            startHeight: label.offsetHeight,
          };
        } else {
          // bar
          const anchorMap = {
            nw: { x: cr.right, y: cr.bottom },
            ne: { x: cr.left, y: cr.bottom },
            sw: { x: cr.right, y: cr.top },
            se: { x: cr.left, y: cr.top },
          };
          const anchor = anchorMap[corner];
          resizeStartData = {
            type: "bar",
            anchorX: anchor.x,
            anchorY: anchor.y,
            startHeight: label.offsetHeight,
          };
        }

        resizeEl.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }

    // Start drag
    dragEl = label;

    if (selectedElements.has(label) && selectedElements.size > 1) {
      draggedElements = [...selectedElements];
    } else {
      clearSelection();
      selectSingle(label);
      draggedElements = [label];
    }

    dragStartCX = cx;
    dragStartCY = cy;

    dragStartAbsPos.clear();
    for (const el of draggedElements) {
      const [x, y] = parsePosition(el);
      dragStartAbsPos.set(el.id, { x, y });
    }

    const primaryStart = dragStartAbsPos.get(dragEl.id);
    dragStartAbsX = primaryStart.x;
    dragStartAbsY = primaryStart.y;

    const rect = dragEl.getBoundingClientRect();
    dragEl._snapSize = {
      w: rect.width / currentScale,
      h: rect.height / currentScale,
    };

    snappedX.active = false;
    snappedY.active = false;

    dragEl.setPointerCapture(e.pointerId);
    dragEl.style.cursor = "grabbing";
    e.preventDefault();
  }

  function onPointerMove(e) {
    const { cx, cy } = getCanvasCoords(e);

    // Resize mode
    if (resizeEl) {
      if (isTextElement(resizeEl)) {
        const { startFontSize, centerX, centerY } = resizeStartData;
        const dStart = Math.sqrt(
          (resizeCX - centerX) ** 2 + (resizeCY - centerY) ** 2,
        );
        const dCurrent = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);
        const ratio = dStart > 0 ? dCurrent / dStart : 1;
        const newSize = Math.round(
          Math.max(8, Math.min(200, startFontSize * ratio)),
        );
        if (resizeEl.id === "todoContainer") {
          resizeEl.style.setProperty("--todo-font-size", newSize + "px");
          params.todoFontSize = String(newSize);
        } else {
          resizeEl.style.fontSize = newSize + "px";
        }
      } else {
        // bar
        const { anchorX, anchorY } = resizeStartData;
        const corner = resizeCorner;
        let newW, newH;
        if (corner === "se") {
          newW = Math.max(RESIZE_MIN, cx - anchorX);
          newH = Math.max(RESIZE_MIN, cy - anchorY);
        } else if (corner === "nw") {
          newW = Math.max(RESIZE_MIN, anchorX - cx);
          newH = Math.max(RESIZE_MIN, anchorY - cy);
        } else if (corner === "ne") {
          newW = Math.max(RESIZE_MIN, cx - anchorX);
          newH = Math.max(RESIZE_MIN, anchorY - cy);
        } else {
          // sw
          newW = Math.max(RESIZE_MIN, anchorX - cx);
          newH = Math.max(RESIZE_MIN, cy - anchorY);
        }
        resizeEl.style.width = newW + "px";
        resizeEl.style.height = newH + "px";
        if (corner === "ne") resizeEl.style.top = cy + "px";
        else if (corner === "sw") resizeEl.style.left = cx + "px";
        else if (corner === "nw") {
          resizeEl.style.left = cx + "px";
          resizeEl.style.top = cy + "px";
        }
        const inner = resizeEl._barInnerElement;
        if (inner) {
          inner.style.width = newW + "px";
          inner.style.height = newH + "px";
        }
      }
      e.preventDefault();
      return;
    }

    // Box select mode
    if (boxSelectOrigin) {
      const dx = cx - boxSelectOrigin.cx;
      const dy = cy - boxSelectOrigin.cy;
      if (
        !boxSelectActive &&
        Math.sqrt(dx * dx + dy * dy) > BOX_SELECT_THRESHOLD
      ) {
        boxSelectActive = true;
        clearSelection();
      }
      if (boxSelectActive) {
        const rect = document.getElementById("box-select-rect");
        if (rect) {
          const left = Math.min(boxSelectOrigin.cx, cx);
          const top = Math.min(boxSelectOrigin.cy, cy);
          rect.style.left = left + "px";
          rect.style.top = top + "px";
          rect.style.width = Math.abs(cx - boxSelectOrigin.cx) + "px";
          rect.style.height = Math.abs(cy - boxSelectOrigin.cy) + "px";
          rect.style.display = "block";
        }
      }
      e.preventDefault();
      return;
    }

    // Cursor feedback on hover (no drag active)
    if (!dragEl) {
      // Find hovered element and check corners
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      if (hovered) {
        const label = hovered.closest(TARGETS);
        if (
          label &&
          selectedElements.has(label) &&
          label.style.display !== "none"
        ) {
          setCursorForTarget(label, cx, cy);
        } else {
          canvas.style.cursor = "";
        }
      } else {
        canvas.style.cursor = "";
      }
      return;
    }

    // Drag mode
    const deltaX = cx - dragStartCX;
    const deltaY = cy - dragStartCY;

    const primaryStart = dragStartAbsPos.get(dragEl.id);
    let rawAbsX = primaryStart.x + deltaX;
    let rawAbsY = primaryStart.y + deltaY;

    if (snapEnabled) {
      [rawAbsX, rawAbsY] = applySnapAbs(
        dragEl.id,
        rawAbsX,
        rawAbsY,
        params,
        dragStartAbsX,
        dragStartAbsY,
        dragEl._snapSize,
      );
      updateSnapGuides(params);
    } else {
      clearSnapGuides();
    }

    const adjustedDeltaX = rawAbsX - primaryStart.x;
    const adjustedDeltaY = rawAbsY - primaryStart.y;

    for (const el of draggedElements) {
      const start = dragStartAbsPos.get(el.id);
      if (!start) continue;
      el.style.left = start.x + adjustedDeltaX + "px";
      el.style.top = start.y + adjustedDeltaY + "px";
    }

    e.preventDefault();
  }

  function onPointerUp(e) {
    const { cx, cy } = getCanvasCoords(e);

    // Handle resize end
    if (resizeEl) {
      const targetMap = {
        title: "title",
        percentage: "time",
        progressContainer: "bar",
        todoContainer: "todo",
      };
      const target = targetMap[resizeEl.id] || "bar";

      if (isTextElement(resizeEl)) {
        let fontSize;
        if (resizeEl.id === "todoContainer") {
          fontSize = parseInt(params.todoFontSize) || 20;
        } else {
          fontSize = parseInt(resizeEl.style.fontSize) || 40;
        }
        window.parent.postMessage({ type: "resize", target, fontSize }, "*");
      } else {
        const w = parseInt(resizeEl.style.width) || 500;
        const h = parseInt(resizeEl.style.height) || 60;
        params.barWidth = String(w);
        params.barHeight = String(h);
        window.parent.postMessage(
          { type: "resize", target, width: w, height: h },
          "*",
        );
      }

      // Sync parent state so exiting position mode matches what user sees
      const syncTargets = [
        document.getElementById("title"),
        document.getElementById("percentage"),
        document.getElementById("progressContainer"),
        document.getElementById("todoContainer"),
      ];
      const syncTargetMap = {
        title: "title",
        percentage: "time",
        progressContainer: "bar",
        todoContainer: "todo",
      };
      for (const el of syncTargets) {
        if (!el || el.style.display === "none") continue;
        const st = syncTargetMap[el.id] || "bar";
        const [absX, absY] = parsePosition(el);
        window.parent.postMessage(
          {
            type: "position",
            target: st,
            x: absX,
            y: absY,
          },
          "*",
        );
      }

      resizeEl.releasePointerCapture(e.pointerId);
      resizeEl = null;
      resizeCorner = null;
      resizeStartData = {};
      e.preventDefault();
      return;
    }

    // Handle box select end
    if (boxSelectOrigin) {
      if (boxSelectActive) {
        const ox = boxSelectOrigin.cx;
        const oy = boxSelectOrigin.cy;
        const selRect = {
          left: Math.min(ox, cx),
          top: Math.min(oy, cy),
          right: Math.max(ox, cx),
          bottom: Math.max(oy, cy),
        };
        document.querySelectorAll(TARGETS).forEach((el) => {
          if (el.style.display === "none") return;
          const er = getElementCanvasRect(el);
          if (rectsIntersect(selRect, er)) {
            selectedElements.add(el);
            el.classList.add("selected");
            addHandles(el);
          }
        });
      } else {
        clearSelection();
      }
      boxSelectOrigin = null;
      boxSelectActive = false;
      const rect = document.getElementById("box-select-rect");
      if (rect) rect.style.display = "none";
      e.preventDefault();
      return;
    }

    // Handle drag end
    if (!dragEl) return;

    const targetMap = {
      title: "title",
      percentage: "time",
      progressContainer: "bar",
      todoContainer: "todo",
    };

    for (const el of draggedElements) {
      const target = targetMap[el.id] || "bar";
      const [absX, absY] = parsePosition(el);

      window.parent.postMessage(
        { type: "position", target, x: absX, y: absY },
        "*",
      );
    }

    dragEl.style.cursor = "grab";
    dragEl.releasePointerCapture(e.pointerId);
    dragEl = null;
    draggedElements = [];
    dragStartAbsPos.clear();

    snappedX.active = false;
    snappedY.active = false;
    clearSnapGuides();
  }

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);

  canvas._dragCleanup = () => {
    clearSnapGuides();
    clearSelection();
    resizeEl = null;
    resizeCorner = null;
    resizeStartData = {};
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.querySelectorAll(TARGETS).forEach((label) => {
      label.style.cursor = "";
      label.classList.remove("selected");
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

  if (params.milestones && params.milestones.length > 0) {
    searchParams.set("milestones", JSON.stringify(params.milestones));
  }

  if (params.todos && params.todos.length > 0) {
    searchParams.set("todos", JSON.stringify(params.todos));
  }

  const newUrl = window.location.pathname + "?" + searchParams.toString();
  history.replaceState(null, "", newUrl);
}

function renderMilestones(params) {
  const container = document.getElementById("progressContainer");
  if (!container) return;

  container.querySelectorAll(".milestone-marker").forEach((el) => el.remove());

  if (!params.milestones || params.milestones.length === 0) return;
  if (params.max <= 0) return;

  const w = parseInt(params.barWidth) || 500;
  const h = parseInt(params.barHeight) || 60;
  const isHorizontal = params.orientation !== "vertical";

  params.milestones.forEach((ms) => {
    const ratio = ms.seconds / params.max;
    const group = document.createElement("div");
    group.className = "milestone-marker";

    const line = document.createElement("div");
    line.className = "milestone-marker-line";

    const label = document.createElement("span");
    label.className = "milestone-marker-label";
    label.textContent = ms.text;

    if (isHorizontal) {
      const lineX = ratio * w;
      line.style.left = lineX + "px";
      line.style.top = "0";
      line.style.width = "2px";
      line.style.height = h + "px";

      label.style.left = lineX + "px";
      label.style.top = h + 4 + "px";
      label.style.transform = "translateX(-50%)";
    } else {
      const lineY = (1 - ratio) * h;
      line.style.left = "0";
      line.style.top = lineY + "px";
      line.style.width = w + "px";
      line.style.height = "2px";

      label.style.left = w + 4 + "px";
      label.style.top = lineY + "px";
      label.style.transform = "translateY(-50%)";
    }

    group.appendChild(line);
    if (ms.text) {
      group.appendChild(label);
    }
    container.appendChild(group);
  });
}

function renderTodos(params) {
  const container = document.getElementById("todoContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!params.todos || params.todos.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "";
  container.style.setProperty(
    "--todo-font-size",
    (params.todoFontSize || "20") + "px",
  );

  params.todos.forEach((todo) => {
    const item = document.createElement("div");
    item.className = "todo-item" + (todo.done ? " done" : "");

    const bullet = document.createElement("div");
    bullet.className = "todo-item-bullet";

    const text = document.createElement("span");
    text.className = "todo-item-text";
    text.textContent = todo.text;

    item.appendChild(bullet);
    item.appendChild(text);
    container.appendChild(item);
  });
}

let twitchClient = null;

function toggleTodo(params, index, done) {
  if (!params.todos || index < 0 || index >= params.todos.length) return;
  params.todos[index] = { ...params.todos[index], done };
  renderTodos(params);
}

function initTwitch(params, callbacks) {
  const statusEl = document.getElementById("twitch-status");
  if (!params.twitchChannel) {
    if (statusEl) statusEl.style.display = "none";
    return;
  }

  const channel = params.twitchChannel.replace(/^#/, "").toLowerCase();
  if (!channel) {
    if (statusEl) statusEl.style.display = "none";
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Twitch: connecting...";
    statusEl.style.display = "";
  }

  try {
    const client = new tmi.Client({
      channels: [channel],
    });

    client.on("connected", () => {
      if (statusEl) statusEl.textContent = "Twitch: connected to #" + channel;
    });

    client.on("disconnected", (reason) => {
      if (statusEl)
        statusEl.textContent =
          "Twitch: disconnected (" + (reason || "unknown") + ")";
    });

    client.on("message", (_channel, userstate, message, _self) => {
      const username = (
        userstate["display-name"] ||
        userstate.username ||
        ""
      ).toLowerCase();

      // Check if a specific username is required
      if (params.twitchUsername) {
        const allowed = params.twitchUsername.toLowerCase();
        if (username !== allowed) return;
      }

      const trimmed = message.trim();

      // Parse !progress milestone <n> command
      const progressMatch = trimmed.match(
        /^!progress\s+milestone\s+(\d+)\s*$/i,
      );
      if (progressMatch && callbacks && callbacks.setProgressValue) {
        const msIndex = parseInt(progressMatch[1], 10) - 1;
        if (
          msIndex >= 0 &&
          msIndex < params.milestones.length &&
          params.max > 0
        ) {
          const value = Math.min(
            params.milestones[msIndex].seconds,
            params.max,
          );
          callbacks.setProgressValue(value);
          window.parent.postMessage({ type: "progressJump", value }, "*");
        }
        return;
      }

      // Parse !todo commands
      const todoMatch = trimmed.match(
        /^!todo\s+(\d+)\s+(done|undone|toggle|check|uncheck)\s*$/i,
      );
      if (!todoMatch) return;

      const index = parseInt(todoMatch[1], 10) - 1; // 1-indexed in chat, 0-indexed in code
      const action = todoMatch[2].toLowerCase();

      let newDone;
      if (action === "done" || action === "check") {
        newDone = true;
      } else if (action === "undone" || action === "uncheck") {
        newDone = false;
      } else {
        // toggle
        if (index >= 0 && index < params.todos.length) {
          newDone = !params.todos[index].done;
        } else {
          return;
        }
      }

      toggleTodo(params, index, newDone);

      // Update the URL so the state persists on refresh
      updateURL(params.start, params.max, params);

      // Notify parent iframe (for preview mode)
      window.parent.postMessage(
        { type: "todoToggle", index, done: newDone },
        "*",
      );
    });

    client.connect();
    twitchClient = client;
  } catch (err) {
    if (statusEl) statusEl.textContent = "Twitch: error (" + err.message + ")";
    console.error("Twitch init error:", err);
  }
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
  const progressContainer = document.getElementById("progressContainer");
  const progressElement = style.init(progressContainer, params);
  progressContainer._barInnerElement = progressElement;

  makeAbsolute();

  applyPositions(params);

  renderMilestones(params);
  renderTodos(params);

  let currentValue = params.start;

  const twitchCallbacks = {
    setProgressValue: (value) => {
      params.start = value;
      currentValue = value;
      updateProgress(value, params.max);
      updateDisplay(value, params.max, params);
      updateURL(value, params.max, params);
    },
  };
  initTwitch(params, twitchCallbacks);

  function updateProgress(value, maxValue) {
    style.update(progressElement, value, maxValue, params);
  }

  updateProgress(params.start, params.max);
  updateDisplay(params.start, params.max, params);
  updateURL(params.start, params.max, params);

  if (!params.positionMode) {
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
    } else if (event.data?.type === "snap") {
      snapEnabled = event.data.enabled;
    } else if (event.data?.type === "bar-state") {
      const d = event.data;
      setElementPosition(document.getElementById("title"), d.titleX, d.titleY);
      setElementPosition(
        document.getElementById("percentage"),
        d.timeX,
        d.timeY,
      );
      setElementPosition(
        document.getElementById("progressContainer"),
        d.barX,
        d.barY,
      );
      setElementPosition(
        document.getElementById("todoContainer"),
        d.todoX,
        d.todoY,
      );
      if (d.barWidth) {
        const barEl = document.getElementById("progressContainer");
        barEl.style.width = d.barWidth + "px";
        barEl.style.height = d.barHeight + "px";
        const inner = barEl._barInnerElement;
        if (inner) {
          inner.style.width = d.barWidth + "px";
          inner.style.height = d.barHeight + "px";
        }
      }
      if (d.titleFontSize)
        document.getElementById("title").style.fontSize =
          d.titleFontSize + "px";
      if (d.timeFontSize)
        document.getElementById("percentage").style.fontSize =
          d.timeFontSize + "px";
      if (d.todoFontSize) {
        const tc = document.getElementById("todoContainer");
        if (tc) tc.style.setProperty("--todo-font-size", d.todoFontSize + "px");
      }
    }
  });
}
