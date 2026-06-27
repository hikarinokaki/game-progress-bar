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
  setTitlePosition,
  setTimePosition,
  setTitleFontSize,
  setOrientation,
  setMaskImageUrl,
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
  titlePositionSelect,
  timePositionSelect,
  titleFontSizeSelect,
  orientationSelect,
  maskImageUrlInput,
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

function syncSupportedOptions() {
  const options = getSupportedOptions(state.style);
  document.getElementById("maskImageRow").style.display = options.maskImageUrl
    ? ""
    : "none";
  // Hide parent labels for un-supported options
  const label = (id) => document.getElementById(id)?.closest("label");
  const lbl = label("barWidthInput");
  if (lbl) lbl.style.display = options.barWidth ? "" : "none";
  const hlbl = label("barHeightInput");
  if (hlbl) hlbl.style.display = options.barHeight ? "" : "none";
  const olbl = label("orientationSelect");
  if (olbl) olbl.style.display = options.orientation ? "" : "none";
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
  titlePositionSelect.value = state.titlePosition;
  timePositionSelect.value = state.timePosition;
  titleFontSizeSelect.value = state.titleFontSize;
  orientationSelect.value = state.orientation;
  maskImageUrlInput.value = state.maskImageUrl;

  syncSupportedOptions();
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

  titlePositionSelect.addEventListener("change", (e) => {
    setTitlePosition(e.target.value);
    render();
  });

  timePositionSelect.addEventListener("change", (e) => {
    setTimePosition(e.target.value);
    render();
  });

  titleFontSizeSelect.addEventListener("change", (e) => {
    setTitleFontSize(e.target.value);
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

  render();
}
