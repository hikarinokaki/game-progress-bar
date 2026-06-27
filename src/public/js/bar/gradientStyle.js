export const gradientStyle = {
  name: "gradient",
  displayName: "CSS Gradient Animation",
  supportedOptions: {
    barWidth: true,
    barHeight: true,
    titlePosition: true,
    titleFontSize: true,
    timePosition: true,
    orientation: true,
    maskImageUrl: false,
  },

  init(container, params) {
    const div = document.createElement("div");
    div.className = "progress-bar-gradient";
    div.style.width = params.barWidth;
    div.style.height = params.barHeight;

    if (params.orientation === "vertical") {
      div.style.background = `linear-gradient(${params.accentColor} 0 0) bottom/100% 0% no-repeat ${params.bgColor}`;
    } else {
      div.style.background = `linear-gradient(${params.accentColor} 0 0) 0/0% no-repeat ${params.bgColor}`;
    }

    container.appendChild(div);
    return div;
  },

  update(element, value, max, params) {
    const percent = max > 0 ? (value / max) * 100 : 0;
    const isCountdown = params.direction === "countdown";

    if (params.orientation === "vertical") {
      const bgSize = (percent / 100) * 115;
      element.style.backgroundSize = `100% ${bgSize}%`;
      element.style.backgroundPosition = "bottom";
    } else {
      const pos = isCountdown ? "100%" : "0";
      element.style.background = `linear-gradient(${params.accentColor} 0 0) ${pos}/${percent}% no-repeat ${params.bgColor}`;
    }
  },

  destroy(element) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
  },
};
