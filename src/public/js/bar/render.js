import { secondsToNaturalTime } from "./logic.js";

export const canvasState = { scale: 1 };

export function initCanvas(params) {
  const canvas = document.getElementById("bar-canvas");
  const cw = parseInt(params.canvasWidth) || 1920;
  const ch = parseInt(params.canvasHeight) || 1080;

  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";

  function resize() {
    const scaleX = window.innerWidth / cw;
    const scaleY = window.innerHeight / ch;
    canvasState.scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${canvasState.scale})`;
  }

  window.addEventListener("resize", resize);
  resize();
}

export function makeAbsolute() {
  const canvas = document.getElementById("bar-canvas");
  if (!canvas) return;
  const scale = canvasState.scale;
  const canvasRect = canvas.getBoundingClientRect();

  document
    .querySelectorAll("#percentage, #progressContainer, #todoContainer")
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

function setElementPosition(el, x, y) {
  if (!el) return;
  let changed = false;
  if (x !== "") {
    el.style.left = x + "px";
    changed = true;
  }
  if (y !== "") {
    el.style.top = y + "px";
    changed = true;
  }
  if (changed) {
    el.style.position = "absolute";
    el.style.margin = "0";
    el.style.transform = "";
  }
}

export function applyPositions(params) {
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

export function updateDisplay(currentValue, maxValue, params) {
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

export function renderMilestones(params) {
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

    const offX = parseInt(params.msLabelOffsetX) || 0;
    const offY = parseInt(params.msLabelOffsetY) || 0;
    const fontSize = parseInt(params.msLabelFontSize) || 14;

    if (isHorizontal) {
      const lineX = ratio * w;
      line.style.left = lineX + "px";
      line.style.top = "0";
      line.style.width = "2px";
      line.style.height = h + "px";

      label.style.left = lineX + offX + "px";
      label.style.top = h + offY + "px";
      label.style.transform = "translateX(-50%)";
    } else {
      const lineY = (1 - ratio) * h;
      line.style.left = "0";
      line.style.top = lineY + "px";
      line.style.width = w + "px";
      line.style.height = "2px";

      label.style.left = w + offX + "px";
      label.style.top = lineY + offY + "px";
      label.style.transform = "translateY(-50%)";
    }

    group.appendChild(line);
    if (ms.text) {
      label.style.fontSize = fontSize + "px";
      group.appendChild(label);
    }
    container.appendChild(group);
  });
}

export function renderTodos(params) {
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

export function setupTitle(params) {
  const titleElement = document.getElementById("title");
  if (params.title) {
    titleElement.textContent = params.title;
    titleElement.style.display = "block";
  } else {
    titleElement.style.display = "none";
  }
}
