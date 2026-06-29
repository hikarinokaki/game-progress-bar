import { rectsIntersect } from "./logic.js";
import { canvasState } from "./render.js";

const SNAP_THRESHOLD = 16;
const RELEASE_THRESHOLD = 28;
let snapEnabled = false;
let snappedX = { active: false, snapValue: 0 };
let snappedY = { active: false, snapValue: 0 };

let boxSelectOrigin = null;
let boxSelectActive = false;
const BOX_SELECT_THRESHOLD = 4;

const selectedElements = new Set();

const CORNER_THRESHOLD = 12;
const RESIZE_MIN = 20;

export function setSnapEnabled(v) {
  snapEnabled = v;
}

export function getBarCanvasBounds(params) {
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

export function getCanvasBounds(params) {
  const w = parseInt(params.canvasWidth) || 1920;
  const h = parseInt(params.canvasHeight) || 1080;
  return { width: w, height: h, cx: w / 2, cy: h / 2 };
}

export function getSnapCandidates(elId, elSize, params) {
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

export function applySnapAbs(
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

function getElementCanvasRect(el) {
  const canvasEl = document.getElementById("bar-canvas");
  const canvasRect = canvasEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    left: (rect.left - canvasRect.left) / canvasState.scale,
    top: (rect.top - canvasRect.top) / canvasState.scale,
    right: (rect.right - canvasRect.left) / canvasState.scale,
    bottom: (rect.bottom - canvasRect.top) / canvasState.scale,
    width: rect.width / canvasState.scale,
    height: rect.height / canvasState.scale,
    cx: (rect.left + rect.width / 2 - canvasRect.left) / canvasState.scale,
    cy: (rect.top + rect.height / 2 - canvasRect.top) / canvasState.scale,
  };
}

export function getCorner(el, cx, cy) {
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

export function isTextElement(el) {
  return (
    el.id === "title" || el.id === "percentage" || el.id === "todoContainer"
  );
}

export function parsePosition(el) {
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

export function setupDragEnvironment(params) {
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
      cx: (e.clientX - rect.left) / canvasState.scale,
      cy: (e.clientY - rect.top) / canvasState.scale,
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
      w: rect.width / canvasState.scale,
      h: rect.height / canvasState.scale,
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
