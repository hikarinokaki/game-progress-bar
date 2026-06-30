import { registerStyle } from "./bar/registry.js";
import { gradientStyle } from "./bar/gradientStyle.js";
import { maskStyle } from "./bar/maskStyle.js";
import { initBar } from "./bar/shared.js";

registerStyle(gradientStyle);
registerStyle(maskStyle);

document.addEventListener("DOMContentLoaded", initBar);
