import { registerStyle } from "./bar/registry.js";
import { progressStyle } from "./bar/progressStyle.js";
import { gradientStyle } from "./bar/gradientStyle.js";
import { stepsStyle } from "./bar/stepsStyle.js";
import { maskStyle } from "./bar/maskStyle.js";
import { initBar } from "./bar/shared.js";

registerStyle(progressStyle);
registerStyle(gradientStyle);
registerStyle(stepsStyle);
registerStyle(maskStyle);

document.addEventListener("DOMContentLoaded", initBar);
