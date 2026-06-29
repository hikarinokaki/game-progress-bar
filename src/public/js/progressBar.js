import {
  state,
  setStart,
  setMax,
  setPercent,
  setTitle,
  setStyle,
  setDisplayFormat,
  setAccentColor,
  setBgColor,
  setDirection,
  setInvertDisplay,
  setBarWidth,
  setBarHeight,
  setTitleX,
  setTitleY,
  setTimeX,
  setTimeY,
  setOrientation,
  setMaskImageUrl,
  setCanvasWidth,
  setCanvasHeight,
  setBarX,
  setBarY,
  setTitleFontSize,
  setTimeFontSize,
  setMilestones,
  setTodos,
  setTodoX,
  setTodoY,
  setTodoFontSize,
  setTwitchChannel,
  setTwitchUsername,
} from "./state.js";
import {
  startInput,
  maxInput,
  percentInput,
  startTimeInput,
  maxTimeInput,
  startSlider,
  titleInput,
  styleSelect,
  displayFormatSelect,
  accentColorInput,
  bgColorInput,
  directionSelect,
  invertDisplayCheckbox,
  barWidthInput,
  barHeightInput,
  titleXInput,
  titleYInput,
  timeXInput,
  timeYInput,
  orientationSelect,
  maskImageUrlInput,
  positionModeBtn,
  snapBtn,
  previewFrame,
  canvasWidthInput,
  canvasHeightInput,
  barXInput,
  barYInput,
  titleFontSizeInput,
  timeFontSizeInput,
  todoXInput,
  todoYInput,
  todoFontSizeInput,
  twitchChannelInput,
  twitchUsernameInput,
} from "./domElements.js";
import {
  calculatePercent,
  secondsToText,
  parseTimeToSeconds,
  addScroll,
} from "./utils.js";
import { registerStyle, getSupportedOptions } from "./bar/registry.js";
import { progressStyle } from "./bar/progressStyle.js";
import { gradientStyle } from "./bar/gradientStyle.js";
import { stepsStyle } from "./bar/stepsStyle.js";
import { maskStyle } from "./bar/maskStyle.js";

registerStyle(progressStyle);
registerStyle(gradientStyle);
registerStyle(stepsStyle);
registerStyle(maskStyle);

let positionModeActive = false;
let snapActive = true;

const MAX_UNDO = 50;
const undoStack = [];
const redoStack = [];
let _undoBatch = false;

function snapshotState() {
  return {
    titleX: state.titleX,
    titleY: state.titleY,
    timeX: state.timeX,
    timeY: state.timeY,
    barX: state.barX,
    barY: state.barY,
    barWidth: state.barWidth,
    barHeight: state.barHeight,
    titleFontSize: state.titleFontSize,
    timeFontSize: state.timeFontSize,
    todoX: state.todoX,
    todoY: state.todoY,
    todoFontSize: state.todoFontSize,
  };
}

function pushUndoState() {
  undoStack.push(snapshotState());
  redoStack.length = 0;
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function applyState(snap) {
  setTitleX(snap.titleX);
  setTitleY(snap.titleY);
  setTimeX(snap.timeX);
  setTimeY(snap.timeY);
  setBarX(snap.barX);
  setBarY(snap.barY);
  setBarWidth(snap.barWidth);
  setBarHeight(snap.barHeight);
  setTitleFontSize(snap.titleFontSize);
  setTimeFontSize(snap.timeFontSize);
  setTodoX(snap.todoX);
  setTodoY(snap.todoY);
  setTodoFontSize(snap.todoFontSize);
  render();
  if (positionModeActive) {
    previewFrame.contentWindow?.postMessage(
      { type: "bar-state", ...snap },
      "*",
    );
  }
}

function undo() {
  if (undoStack.length === 0) return;
  const current = snapshotState();
  const previous = undoStack.pop();
  redoStack.push(current);
  applyState(previous);
}

function redo() {
  if (redoStack.length === 0) return;
  const current = snapshotState();
  const next = redoStack.pop();
  undoStack.push(current);
  applyState(next);
}

function syncSupportedOptions() {
  const options = getSupportedOptions(state.style);
  document.getElementById("maskImageRow").style.display = options.maskImageUrl
    ? ""
    : "none";
  const label = (id) => document.getElementById(id)?.closest("label");
  const lbl = label("barWidthInput");
  if (lbl) lbl.style.display = options.barWidth ? "" : "none";
  const hlbl = label("barHeightInput");
  if (hlbl) hlbl.style.display = options.barHeight ? "" : "none";
  const olbl = label("orientationSelect");
  if (olbl) olbl.style.display = options.orientation ? "" : "none";
}

function renderMilestoneList() {
  const list = document.getElementById("milestone-list");
  if (!list) return;
  list.innerHTML = "";

  state.milestones.forEach((ms, i) => {
    const row = document.createElement("div");
    row.className = "milestone-row";

    const timeInput = document.createElement("input");
    timeInput.type = "text";
    timeInput.className = "milestone-time-input";
    timeInput.placeholder = "e.g. 1h 30m";
    timeInput.value = secondsToText(ms.seconds);
    timeInput.addEventListener("change", () => {
      const val = timeInput.value.trim().toLowerCase();
      let seconds = null;
      if (val.endsWith("%")) {
        const pct = parseFloat(val);
        if (!isNaN(pct)) {
          seconds = Math.round((pct / 100) * state.max);
        }
      } else {
        seconds = parseTimeToSeconds(val);
      }
      if (seconds !== null) {
        const updated = [...state.milestones];
        updated[i] = { ...updated[i], seconds: Math.min(seconds, state.max) };
        setMilestones(updated);
        render();
      }
    });

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "milestone-label-input";
    labelInput.placeholder = "Label";
    labelInput.value = ms.text;
    labelInput.addEventListener("change", () => {
      const updated = [...state.milestones];
      updated[i] = { ...updated[i], text: labelInput.value };
      setMilestones(updated);
      render();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "milestone-remove-btn";
    removeBtn.textContent = "\u00d7";
    removeBtn.addEventListener("click", () => {
      const updated = state.milestones.filter((_, idx) => idx !== i);
      setMilestones(updated);
      render();
    });

    row.appendChild(timeInput);
    row.appendChild(labelInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

function renderTodoList() {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = "";

  state.todos.forEach((todo, i) => {
    const row = document.createElement("div");
    row.className = "todo-row";

    const doneCheckbox = document.createElement("input");
    doneCheckbox.type = "checkbox";
    doneCheckbox.className = "todo-done-checkbox";
    doneCheckbox.checked = todo.done;
    doneCheckbox.addEventListener("change", () => {
      const updated = [...state.todos];
      updated[i] = { ...updated[i], done: doneCheckbox.checked };
      setTodos(updated);
      render();
    });

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "todo-text-input";
    textInput.placeholder = "Todo text";
    textInput.value = todo.text;
    textInput.addEventListener("change", () => {
      const updated = [...state.todos];
      updated[i] = { ...updated[i], text: textInput.value };
      setTodos(updated);
      render();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "todo-remove-btn";
    removeBtn.textContent = "\u00d7";
    removeBtn.addEventListener("click", () => {
      const updated = state.todos.filter((_, idx) => idx !== i);
      setTodos(updated);
      render();
    });

    row.appendChild(doneCheckbox);
    row.appendChild(textInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

function syncPreviewFrameSize() {
  const cw = parseInt(state.canvasWidth) || 1920;
  const ch = parseInt(state.canvasHeight) || 1080;
  const maxHeight = window.innerHeight * 0.8;
  const width = previewFrame.clientWidth;
  const naturalHeight = width * (ch / cw);
  previewFrame.style.height = Math.min(naturalHeight, maxHeight) + "px";
}

function togglePositionMode() {
  positionModeActive = !positionModeActive;
  positionModeBtn.textContent = positionModeActive
    ? "Exit Position Mode"
    : "Position Mode";

  if (positionModeActive) {
    previewFrame.src = buildPreviewURL(true);
    syncPreviewFrameSize();
    positionModeBtn.style.background = "#d32f2f";
    positionModeBtn.style.color = "#fff";
  } else {
    previewFrame.contentWindow?.postMessage({ type: "disable-drag" }, "*");
    previewFrame.src = buildPreviewURL(false);
    syncPreviewFrameSize();
    positionModeBtn.style.background = "";
    positionModeBtn.style.color = "";
  }
}

function syncSnapUI() {
  snapBtn.textContent = snapActive ? "Snap: On" : "Snap: Off";
  snapBtn.style.background = snapActive ? "#4CAF50" : "";
  snapBtn.style.color = snapActive ? "#fff" : "";
}

function toggleSnap() {
  snapActive = !snapActive;
  syncSnapUI();
  previewFrame.contentWindow?.postMessage(
    { type: "snap", enabled: snapActive },
    "*",
  );
}

function buildPreviewURL(forPositionMode) {
  const params = new URLSearchParams({
    start: forPositionMode ? state.max : state.start,
    max: state.max,
    title: state.title,
    style: state.style,
    displayFormat: state.displayFormat,
    accentColor: state.accentColor,
    bgColor: state.bgColor,
    direction: forPositionMode ? "increment" : state.direction,
    invertDisplay: "false",
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
    theme: document.documentElement.getAttribute("data-theme") || "default",
    todoX: state.todoX,
    todoY: state.todoY,
    todoFontSize: state.todoFontSize,
    twitchChannel: state.twitchChannel,
    twitchUsername: state.twitchUsername,
  });

  if (forPositionMode) {
    params.set("positionMode", "1");
  }

  if (state.maskImageUrl) {
    params.set("maskImageUrl", state.maskImageUrl);
  }

  if (state.milestones.length > 0) {
    params.set("milestones", JSON.stringify(state.milestones));
  }

  if (state.todos.length > 0) {
    params.set("todos", JSON.stringify(state.todos));
  }

  return "bar.html?" + params.toString();
}

export function render() {
  startInput.value = state.start;
  maxInput.value = state.max;
  percentInput.value = calculatePercent(state.start, state.max);

  startTimeInput.value = secondsToText(state.start);
  maxTimeInput.value = secondsToText(state.max);

  startSlider.min = 0;
  startSlider.max = state.max;
  startSlider.value = state.start;

  titleInput.value = state.title;
  styleSelect.value = state.style;
  displayFormatSelect.value = state.displayFormat;
  accentColorInput.value = state.accentColor;
  bgColorInput.value = state.bgColor;
  directionSelect.value = state.direction;
  invertDisplayCheckbox.checked = state.invertDisplay;

  barWidthInput.value = state.barWidth;
  barHeightInput.value = state.barHeight;
  titleXInput.value = state.titleX;
  titleYInput.value = state.titleY;
  timeXInput.value = state.timeX;
  timeYInput.value = state.timeY;
  barXInput.value = state.barX;
  barYInput.value = state.barY;
  orientationSelect.value = state.orientation;
  maskImageUrlInput.value = state.maskImageUrl;
  canvasWidthInput.value = state.canvasWidth;
  canvasHeightInput.value = state.canvasHeight;
  titleFontSizeInput.value = state.titleFontSize;
  timeFontSizeInput.value = state.timeFontSize;

  todoXInput.value = state.todoX;
  todoYInput.value = state.todoY;
  todoFontSizeInput.value = state.todoFontSize;
  twitchChannelInput.value = state.twitchChannel;
  twitchUsernameInput.value = state.twitchUsername;

  syncSupportedOptions();
  renderMilestoneList();
  renderTodoList();
}

export function initProgressBar() {
  titleInput.addEventListener("input", (e) => {
    setTitle(e.target.value);
    render();
  });

  styleSelect.addEventListener("change", (e) => {
    setStyle(e.target.value);
    render();
  });

  displayFormatSelect.addEventListener("change", (e) => {
    setDisplayFormat(e.target.value);
    render();
  });

  accentColorInput.addEventListener("input", (e) => {
    setAccentColor(e.target.value);
    render();
  });

  bgColorInput.addEventListener("input", (e) => {
    setBgColor(e.target.value);
    render();
  });

  directionSelect.addEventListener("change", (e) => {
    setDirection(e.target.value);
    render();
  });

  invertDisplayCheckbox.addEventListener("change", (e) => {
    setInvertDisplay(e.target.checked);
    render();
  });

  startInput.addEventListener("input", (e) => {
    setStart(e.target.value);
    render();
  });
  maxInput.addEventListener("input", (e) => {
    setMax(e.target.value);
    render();
  });
  percentInput.addEventListener("input", (e) => {
    setPercent(e.target.value);
    render();
  });

  startTimeInput.addEventListener("change", (e) => {
    const seconds = parseTimeToSeconds(e.target.value);
    if (seconds !== null) {
      setStart(seconds);
      render();
    }
  });

  maxTimeInput.addEventListener("change", (e) => {
    const seconds = parseTimeToSeconds(e.target.value);
    if (seconds !== null) {
      setMax(seconds);
      render();
    }
  });

  startSlider.addEventListener("input", (e) => {
    setStart(e.target.value);
    render();
  });

  addScroll(percentInput, (d) => {
    setPercent(calculatePercent(state.start, state.max) + d);
    render();
  });

  addScroll(startSlider, (d) => {
    const increment = Math.max(1, Math.round(state.max * 0.01));
    setStart(state.start + d * increment);
    render();
  });

  barWidthInput.addEventListener("change", (e) => {
    setBarWidth(e.target.value);
    render();
  });

  barHeightInput.addEventListener("change", (e) => {
    setBarHeight(e.target.value);
    render();
  });

  titleXInput.addEventListener("change", (e) => {
    setTitleX(e.target.value);
    render();
  });

  titleYInput.addEventListener("change", (e) => {
    setTitleY(e.target.value);
    render();
  });

  timeXInput.addEventListener("change", (e) => {
    setTimeX(e.target.value);
    render();
  });

  timeYInput.addEventListener("change", (e) => {
    setTimeY(e.target.value);
    render();
  });

  orientationSelect.addEventListener("change", (e) => {
    setOrientation(e.target.value);
    render();
  });

  maskImageUrlInput.addEventListener("change", (e) => {
    setMaskImageUrl(e.target.value);
    render();
  });

  canvasWidthInput.addEventListener("change", (e) => {
    setCanvasWidth(e.target.value);
    render();
    syncPreviewFrameSize();
  });

  canvasHeightInput.addEventListener("change", (e) => {
    setCanvasHeight(e.target.value);
    render();
    syncPreviewFrameSize();
  });

  barXInput.addEventListener("change", (e) => {
    setBarX(e.target.value);
    render();
  });

  barYInput.addEventListener("change", (e) => {
    setBarY(e.target.value);
    render();
  });

  titleFontSizeInput.addEventListener("change", (e) => {
    setTitleFontSize(e.target.value);
    render();
  });

  timeFontSizeInput.addEventListener("change", (e) => {
    setTimeFontSize(e.target.value);
    render();
  });

  todoXInput.addEventListener("change", (e) => {
    setTodoX(e.target.value);
    render();
  });

  todoYInput.addEventListener("change", (e) => {
    setTodoY(e.target.value);
    render();
  });

  todoFontSizeInput.addEventListener("change", (e) => {
    setTodoFontSize(e.target.value);
    render();
  });

  twitchChannelInput.addEventListener("change", (e) => {
    setTwitchChannel(e.target.value);
    render();
  });

  twitchUsernameInput.addEventListener("change", (e) => {
    setTwitchUsername(e.target.value);
    render();
  });

  positionModeBtn.addEventListener("click", togglePositionMode);
  snapBtn.addEventListener("click", toggleSnap);
  syncSnapUI();

  const addMilestoneBtn = document.getElementById("addMilestoneBtn");
  if (addMilestoneBtn) {
    addMilestoneBtn.addEventListener("click", () => {
      const updated = [...state.milestones, { seconds: 0, text: "" }];
      setMilestones(updated);
      render();
    });
  }

  const addTodoBtn = document.getElementById("addTodoBtn");
  if (addTodoBtn) {
    addTodoBtn.addEventListener("click", () => {
      const updated = [...state.todos, { text: "", done: false }];
      setTodos(updated);
      render();
    });
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "todoToggle") {
      const { index, done } = event.data;
      const updated = [...state.todos];
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], done };
        setTodos(updated);
        render();
      }
      return;
    }
    if (event.data?.type === "progressJump") {
      const { value } = event.data;
      setStart(value);
      render();
      return;
    }
    if (event.data?.type === "position" || event.data?.type === "resize") {
      if (!_undoBatch) {
        _undoBatch = true;
        pushUndoState();
        setTimeout(() => {
          _undoBatch = false;
        }, 0);
      }
    }
    if (event.data?.type === "position") {
      const { target, x, y } = event.data;
      if (target === "title") {
        setTitleX(String(x));
        setTitleY(String(y));
      } else if (target === "time") {
        setTimeX(String(x));
        setTimeY(String(y));
      } else if (target === "bar") {
        setBarX(String(x));
        setBarY(String(y));
      } else if (target === "todo") {
        setTodoX(String(x));
        setTodoY(String(y));
      }
      render();
    } else if (event.data?.type === "resize") {
      const { target, fontSize, width, height } = event.data;
      if (target === "title" && fontSize) {
        setTitleFontSize(String(fontSize));
      } else if (target === "time" && fontSize) {
        setTimeFontSize(String(fontSize));
      } else if (target === "bar" && width && height) {
        setBarWidth(String(width));
        setBarHeight(String(height));
      } else if (target === "todo" && fontSize) {
        setTodoFontSize(String(fontSize));
      }
      render();
    }
  });

  // Handle iframe load to enable drag mode, sync size, and restore snap
  previewFrame.addEventListener("load", () => {
    syncPreviewFrameSize();
    if (positionModeActive) {
      previewFrame.contentWindow?.postMessage({ type: "enable-drag" }, "*");
    }
    if (snapActive) {
      previewFrame.contentWindow?.postMessage(
        { type: "snap", enabled: true },
        "*",
      );
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      redo();
    }
  });

  render();
  syncPreviewFrameSize();
  window.addEventListener("resize", syncPreviewFrameSize);
}
