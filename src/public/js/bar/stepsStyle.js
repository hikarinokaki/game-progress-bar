export const stepsStyle = {
  name: "steps",
  displayName: "Step-wise Circle",
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
    div.className = "progress-bar-steps";
    div.style.width = params.barWidth;
    div.style.height = params.barHeight;
    div.style.background = `linear-gradient(${params.accentColor} 0 0) bottom/100% 0% no-repeat ${params.bgColor}`;

    container.appendChild(div);
    return div;
  },

  update(element, value, max, params) {
    const percent = max > 0 ? (value / max) * 100 : 0;
    const bgSize = (percent / 100) * 115;
    element.style.backgroundSize = `100% ${bgSize}%`;
  },

  destroy(element) {
    if (element && element.parentNode) element.parentNode.removeChild(element);
  },
};
