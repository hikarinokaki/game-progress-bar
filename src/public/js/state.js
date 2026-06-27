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
  titlePosition: "top",
  timePosition: "bottom",
  titleFontSize: "2.5em",
  orientation: "horizontal",
  maskImageUrl: "",
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

export function setTitlePosition(value) {
  state.titlePosition = value;
}

export function setTimePosition(value) {
  state.timePosition = value;
}

export function setTitleFontSize(value) {
  state.titleFontSize = value;
}

export function setOrientation(value) {
  state.orientation = value;
}

export function setMaskImageUrl(value) {
  state.maskImageUrl = value;
}
