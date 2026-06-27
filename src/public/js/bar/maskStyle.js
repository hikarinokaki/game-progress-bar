export const maskStyle = {
  name: "mask",
  displayName: "Image Mask",
  supportedOptions: {
    barWidth: true,
    barHeight: true,
    titlePosition: true,
    titleFontSize: true,
    timePosition: true,
    orientation: true,
    maskImageUrl: true,
  },

  init(container, params) {
    const wrap = document.createElement("div");
    wrap.className = "progress-bar-mask";
    wrap.style.cssText = `
      position: relative;
      width: ${params.barWidth}px;
      height: ${params.barHeight}px;
      background: ${params.bgColor};
      overflow: hidden;
    `;

    const track = document.createElement("div");
    track.className = "mask-track";
    track.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: url(${params.maskImageUrl});
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      opacity: 0.3;
    `;

    const fill = document.createElement("div");
    fill.className = "mask-fill";
    fill.style.cssText = `
      position: absolute;
      inset: 0;
      background-color: ${params.accentColor};
      -webkit-mask-image: url(${params.maskImageUrl});
      -webkit-mask-size: contain;
      -webkit-mask-position: center;
      -webkit-mask-repeat: no-repeat;
      mask-image: url(${params.maskImageUrl});
      mask-size: contain;
      mask-position: center;
      mask-repeat: no-repeat;
    `;

    if (params.orientation === "vertical") {
      fill.style.WebkitMaskSize = "100% 0%";
      fill.style.maskSize = "100% 0%";
    } else {
      fill.style.WebkitMaskSize = "0% 100%";
      fill.style.maskSize = "0% 100%";
    }

    wrap.appendChild(track);
    wrap.appendChild(fill);
    container.appendChild(wrap);
    return fill;
  },

  update(element, value, max, params) {
    const percent = max > 0 ? (value / max) * 100 : 0;
    const isCountdown = params.direction === "countdown";

    if (params.orientation === "vertical") {
      const bgSize = Math.min(percent, 100);
      element.style.WebkitMaskSize = `100% ${bgSize}%`;
      element.style.maskSize = `100% ${bgSize}%`;
      element.style.WebkitMaskPosition = isCountdown
        ? "center top"
        : "center bottom";
      element.style.maskPosition = isCountdown ? "center top" : "center bottom";
    } else {
      const bgSize = Math.min(percent, 100);
      element.style.WebkitMaskSize = `${bgSize}% 100%`;
      element.style.maskSize = `${bgSize}% 100%`;
      element.style.WebkitMaskPosition = isCountdown
        ? "right center"
        : "left center";
      element.style.maskPosition = isCountdown ? "right center" : "left center";
    }
  },

  destroy(element) {
    const wrap = element && element.parentNode;
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  },
};
