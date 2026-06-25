// src/public/js/progressBar.js

import {
  state,
  setStart,
  setMax,
  setPercent,
  setTitle,
  setStyle,
  setDisplayFormat,
  setAccentColor,
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
} from "./domElements.js";
import {
  calculatePercent,
  secondsToText,
  parseTimeToSeconds,
  addScroll,
} from "./utils.js";

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
}

export function initProgressBar() {
  // Title
  titleInput.addEventListener("input", (e) => {
    setTitle(e.target.value);
    render();
  });

  // Style
  styleSelect.addEventListener("change", (e) => {
    setStyle(e.target.value);
    render();
  });

  // Display Format
  displayFormatSelect.addEventListener("change", (e) => {
    setDisplayFormat(e.target.value);
    render();
  });

  // Accent Color
  accentColorInput.addEventListener("input", (e) => {
    setAccentColor(e.target.value);
    render();
  });

  // Numeric Inputs
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

  // Time text inputs
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

  // Slider
  startSlider.addEventListener("input", (e) => {
    setStart(e.target.value);
    render();
  });

  // Scroll support
  addScroll(percentInput, (d) => {
    setPercent(calculatePercent(state.start, state.max) + d);
    render();
  });

  addScroll(startSlider, (d) => {
    const increment = Math.max(1, Math.round(state.max * 0.01)); // 1% of max, minimum 1
    setStart(state.start + d * increment);
    render();
  });

  render(); // Initial render
}
