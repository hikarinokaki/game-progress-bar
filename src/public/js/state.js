import { clamp, calculatePercent } from "./utils.js";

const STORAGE_KEY = "gpb-config";

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    for (const key of Object.keys(state)) {
      if (key in parsed) {
        state[key] = parsed[key];
      }
    }
  } catch (e) {
    console.warn("Failed to load state:", e);
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

export const state = {
  start: 0,
  max: 3600,
  title: "",
  style: "gradient",
  displayFormat: "percentage",
  accentColor: "#4CAF50",
  bgColor: "#ddd",
  direction: "increment",
  invertDisplay: false,
  barWidth: "500",
  barHeight: "60",
  titleX: "18",
  titleY: "8",
  timeX: "944",
  timeY: "572",
  barX: "710",
  barY: "560",
  orientation: "horizontal",
  maskImageUrl: "",
  canvasWidth: "1920",
  canvasHeight: "1080",
  titleFontSize: "40",
  timeFontSize: "32",
  milestones: [],
  todos: [],
  todoX: "1720",
  todoY: "50",
  todoFontSize: "20",
  twitchChannel: "",
  twitchUsername: "",
  msLabelOffsetX: "0",
  msLabelOffsetY: "4",
  msLabelFontSize: "20",
  paused: true,
  grid: "",
};

export function setStart(value) {
  state.start = clamp(Number(value), 0, state.max);
}

export function setMax(value) {
  state.max = clamp(Number(value), 0, Infinity);
  state.start = clamp(state.start, 0, state.max);
}

export function setPercent(percent) {
  percent = clamp(Number(percent), 0, 100);
  state.start = Math.round((percent / 100) * state.max);
}

export function setTitle(value) {
  state.title = value;
}

export function setStyle(value) {
  state.style = value;
}

export function setDisplayFormat(value) {
  state.displayFormat = value;
}

export function setAccentColor(value) {
  state.accentColor = value;
}

export function setBgColor(value) {
  state.bgColor = value;
}

export function setDirection(value) {
  state.direction = value;
}

export function setInvertDisplay(value) {
  state.invertDisplay = value;
}

export function setBarWidth(value) {
  state.barWidth = value;
}

export function setBarHeight(value) {
  state.barHeight = value;
}

export function setTitleX(value) {
  state.titleX = value;
}

export function setTitleY(value) {
  state.titleY = value;
}

export function setTimeX(value) {
  state.timeX = value;
}

export function setTimeY(value) {
  state.timeY = value;
}

export function setBarX(value) {
  state.barX = value;
}

export function setBarY(value) {
  state.barY = value;
}

export function setOrientation(value) {
  state.orientation = value;
}

export function setMaskImageUrl(value) {
  state.maskImageUrl = value;
}

export function setCanvasWidth(value) {
  state.canvasWidth = value;
}

export function setCanvasHeight(value) {
  state.canvasHeight = value;
}

export function setTitleFontSize(value) {
  state.titleFontSize = value;
}

export function setTimeFontSize(value) {
  state.timeFontSize = value;
}

export function setMilestones(value) {
  state.milestones = value;
}

export function setTodos(value) {
  state.todos = value;
}

export function setTodoX(value) {
  state.todoX = value;
}

export function setTodoY(value) {
  state.todoY = value;
}

export function setTodoFontSize(value) {
  state.todoFontSize = value;
}

export function setTwitchChannel(value) {
  state.twitchChannel = value;
}

export function setTwitchUsername(value) {
  state.twitchUsername = value;
}

export function setMsLabelOffsetX(value) {
  state.msLabelOffsetX = value;
}

export function setMsLabelOffsetY(value) {
  state.msLabelOffsetY = value;
}

export function setMsLabelFontSize(value) {
  state.msLabelFontSize = value;
}

export function setPaused(value) {
  state.paused = !!value;
}

export function setGrid(value) {
  state.grid = String(value);
}
