const styles = {};

export function registerStyle(style) {
  styles[style.name] = style;
}

export function getStyle(name) {
  return styles[name] || null;
}

function getAllStyles() {
  return Object.values(styles);
}

export function getSupportedOptions(name) {
  const style = styles[name];
  return style ? { ...style.supportedOptions } : {};
}
