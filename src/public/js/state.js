import { clamp, calculatePercent } from "./utils.js";

export const state = {
  start: 0,
  max: 3600,
  title: "",
  style: "progress",
  displayFormat: "percentage",
  accentColor: "#4CAF50",
  bgColor: "#ddd",
  direction: "increment",
  invertDisplay: false,
  barWidth: "500",
  barHeight: "60",
  titleX: "",
  titleY: "",
  timeX: "",
  timeY: "",
  barX: "",
  barY: "",
  orientation: "horizontal",
  maskImageUrl: "",
  canvasWidth: "1920",
  canvasHeight: "1080",
  titleFontSize: "40",
  timeFontSize: "32",
  milestones: [],
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
