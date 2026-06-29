export function secondsToNaturalTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (remainingMinutes > 0) {
    return `${remainingMinutes}m`;
  }
  return `${remainingSeconds}s`;
}

export function rectsIntersect(a, b) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

export function validateColor(value, fallback) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return fallback;
}

export function validateDisplayFormat(value) {
  const valid = ["percentage", "time", "none"];
  return valid.includes(value) ? value : "percentage";
}

export function validateOrientation(value) {
  const valid = ["horizontal", "vertical"];
  return valid.includes(value) ? value : "horizontal";
}

export function parseMilestones(raw, max) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((m) => ({
        seconds: Math.min(Math.max(0, Number(m.seconds) || 0), max),
        text: String(m.text || ""),
      }))
      .filter((m) => m.seconds > 0 || m.text);
  } catch {
    return [];
  }
}

export function parseTodos(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t) => ({
        text: String(t.text || ""),
        done: !!t.done,
      }))
      .filter((t) => t.text);
  } catch {
    return [];
  }
}

export function clampMilestoneIndex(msIndex, milestones) {
  if (msIndex >= 0 && msIndex < milestones.length) return msIndex;
  return -1;
}

export function parseProgressCommand(message, milestones, max) {
  const match = String(message || "").match(
    /^!progress\s+milestone\s+(\d+)\s*$/i,
  );
  if (!match) return null;
  const msIndex = parseInt(match[1], 10) - 1;
  if (msIndex < 0 || msIndex >= milestones.length || max <= 0) return null;
  return Math.min(milestones[msIndex].seconds, max);
}

export function parseTodoCommand(message) {
  const match = String(message || "").match(
    /^!todo\s+(\d+)\s+(done|undone|toggle|check|uncheck)\s*$/i,
  );
  if (!match) return null;
  const index = parseInt(match[1], 10) - 1;
  const actionStr = match[2].toLowerCase();
  let action;
  if (actionStr === "done" || actionStr === "check") {
    action = "done";
  } else if (actionStr === "undone" || actionStr === "uncheck") {
    action = "undone";
  } else {
    action = "toggle";
  }
  return { index, action };
}

export function applyTodoAction(todos, index, action) {
  if (!todos || index < 0 || index >= todos.length) return null;
  const current = todos[index];
  let done;
  if (action === "done") done = true;
  else if (action === "undone") done = false;
  else done = !current.done;

  const result = todos.slice();
  result[index] = { ...current, done };
  return result;
}
