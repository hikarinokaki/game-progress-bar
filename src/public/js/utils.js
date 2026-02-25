// src/public/js/utils.js

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function calculatePercent(start, max) {
  if (max === 0) return 0;
  return Math.round((start / max) * 100);
}

export function secondsToText(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours > 0 && remaining > 0) {
    return `${hours}h ${remaining}m`;
  }
  if (hours > 0) return `${hours}h`;
  return `${remaining}m`;
}

export function parseTimeToSeconds(input) {
  if (!input) return null;

  input = input.trim().toLowerCase();
  let totalMinutes = 0;

  const hourMatch = input.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }

  const minuteMatch = input.match(
    /(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/,
  );
  if (minuteMatch) {
    totalMinutes += parseFloat(minuteMatch[1]);
  }

  const implicitMatch = input.match(/(\d+(\.\d+)?)\s*h\s*(\d+(\.\d+)?)/);
  if (implicitMatch) {
    totalMinutes =
      parseFloat(implicitMatch[1]) * 60 + parseFloat(implicitMatch[3]);
  }

  if (totalMinutes > 0) {
    return Math.round(totalMinutes * 60);
  }

  return null;
}

export function addScroll(el, callback) {
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    callback(delta);
  });
}
