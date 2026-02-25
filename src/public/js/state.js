// src/public/js/state.js

import { clamp, calculatePercent } from "./utils.js";

export const state = {
  start: 0,
  max: 3600,
  title: "",
  style: "progress",
  displayFormat: "percentage",
  accentColor: "#4CAF50",
};

export function setStart(value) {
  state.start = clamp(Number(value), 0, state.max);
}

export function setMax(value) {
  state.max = clamp(Number(value), 0, Infinity); // Max can't be negative
  state.start = clamp(state.start, 0, state.max); // Ensure start is within new max
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
