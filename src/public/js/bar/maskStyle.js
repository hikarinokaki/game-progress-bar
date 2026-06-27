async function resolveMaskUrl(url) {
  if (!url.toLowerCase().endsWith(".svg")) return url;

  try {
    const res = await fetch(url);
    const text = await res.text();
    const encoded = encodeURIComponent(text)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");
    return `data:image/svg+xml;utf8,${encoded}`;
  } catch {
    console.warn("Failed to fetch SVG mask, falling back to URL");
    return url;
  }
}

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

  async init(container, params) {
    const maskUri = await resolveMaskUrl(params.maskImageUrl);

    const wrap = document.createElement("div");
    wrap.className = "progress-bar-mask";
    wrap.style.cssText = `
      position: relative;
      width: ${params.barWidth};
      height: ${params.barHeight};
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
      -webkit-mask-image: url(${maskUri});
      -webkit-mask-size: contain;
      -webkit-mask-position: center;
      -webkit-mask-repeat: no-repeat;
      mask-image: url(${maskUri});
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
