export const progressStyle = {
  name: "progress",
  displayName: "HTML Progress Bar",
  supportedOptions: {
    barWidth: true,
    barHeight: true,
    titlePosition: true,
    titleFontSize: true,
    timePosition: true,
    orientation: false,
    maskImageUrl: false,
  },

  init(container, params) {
    const progress = document.createElement("progress");
    progress.className = "progress-bar-html";
    progress.style.width = params.barWidth;
    progress.style.height = params.barHeight;

    const styleEl = document.createElement("style");
    styleEl.id = "progress-color-style";
    styleEl.textContent = `
      progress::-webkit-progress-value {
        background-color: ${params.accentColor};
      }
      progress::-moz-progress-bar {
        background-color: ${params.accentColor};
      }
      progress::-webkit-progress-bar {
        background-color: ${params.bgColor};
      }
      progress {
        background-color: ${params.bgColor};
      }
    `;
    document.head.appendChild(styleEl);

    container.appendChild(progress);
    return progress;
  },

  update(element, value, max, params) {
    element.max = max;
    element.value = value;
    element.dir = params.direction === "countdown" ? "rtl" : "ltr";
  },

  destroy(element) {
    const styleEl = document.getElementById("progress-color-style");
    if (styleEl) styleEl.remove();
    if (element && element.parentNode) element.parentNode.removeChild(element);
  },
};
