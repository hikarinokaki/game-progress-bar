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

export function findTodoIndex(todos, id) {
  if (!todos || !id) return -1;
  const num = parseInt(id, 10);
  if (!isNaN(num) && num >= 1 && num <= todos.length) return num - 1;
  const lower = id.toLowerCase();
  for (let i = 0; i < todos.length; i++) {
    if (todos[i].text.toLowerCase().includes(lower)) return i;
  }
  return -1;
}

export function parseTimeExpression(str) {
  if (!str) return null;
  const input = String(str).trim().toLowerCase();
  let totalMinutes = 0;

  const hourMatch = input.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;

  const minuteMatch = input.match(
    /(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/,
  );
  if (minuteMatch) totalMinutes += parseFloat(minuteMatch[1]);

  const implicitMatch = input.match(/(\d+(\.\d+)?)\s*h\s*(\d+(\.\d+)?)/);
  if (implicitMatch) {
    totalMinutes =
      parseFloat(implicitMatch[1]) * 60 + parseFloat(implicitMatch[3]);
  }

  if (totalMinutes > 0) return Math.round(totalMinutes * 60);

  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 0) return num;

  return null;
}

function normalizeAction(str) {
  const a = str.toLowerCase();
  if (a === "done" || a === "check") return "done";
  if (a === "undone" || a === "uncheck") return "undone";
  return "toggle";
}

export function parseBarCommand(str, milestones, max) {
  if (!str) return null;
  const msg = String(str).trim();

  let match = msg.match(/^!bar\s+set\s+(.+)$/i);
  if (match) {
    const val = match[1].trim();
    const msMatch = val.match(/^milestone\s+(\d+)$/i);
    if (msMatch) {
      const index = parseInt(msMatch[1], 10) - 1;
      if (index >= 0 && index < milestones.length && max > 0) {
        return { type: "setMilestone", index };
      }
      return null;
    }
    const seconds = parseTimeExpression(val);
    if (seconds !== null && max > 0) {
      return { type: "set", value: Math.min(seconds, max) };
    }
    return null;
  }

  if (/^!bar\s+pause\s*$/i.test(msg)) {
    return { type: "pause" };
  }

  if (/^!bar\s+resume\s*$/i.test(msg)) {
    return { type: "resume" };
  }

  match = msg.match(
    /^!bar\s+todo\s+"([^"]+)"\s+(done|undone|toggle|check|uncheck)\s*$/i,
  );
  if (match) {
    return {
      type: "todoAction",
      id: match[1],
      action: normalizeAction(match[2]),
    };
  }

  match = msg.match(
    /^!bar\s+todo\s+(\d+)\s+(done|undone|toggle|check|uncheck)\s*$/i,
  );
  if (match) {
    return {
      type: "todoAction",
      id: match[1],
      action: normalizeAction(match[2]),
    };
  }

  match = msg.match(
    /^!bar\s+todo\s+(.+?)\s+(done|undone|toggle|check|uncheck)\s*$/i,
  );
  if (match) {
    const id = match[1].trim();
    if (id) {
      return {
        type: "todoAction",
        id,
        action: normalizeAction(match[2]),
      };
    }
    return null;
  }

  match = msg.match(/^!bar\s+todo\s+add\s+(.+)$/i);
  if (match) {
    const text = match[1].trim();
    if (text) return { type: "todoAdd", text };
    return null;
  }

  match = msg.match(/^!bar\s+todo\s+delete\s+"([^"]+)"\s*$/i);
  if (match) {
    return { type: "todoDelete", id: match[1] };
  }

  match = msg.match(/^!bar\s+todo\s+delete\s+(\d+)\s*$/i);
  if (match) {
    return { type: "todoDelete", id: match[1] };
  }

  match = msg.match(/^!bar\s+todo\s+delete\s+(.+)$/i);
  if (match) {
    const id = match[1].trim();
    if (id) return { type: "todoDelete", id };
    return null;
  }

  match = msg.match(/^!bar\s+milestone\s+add\s+(.+)$/i);
  if (match) {
    const rest = match[1].trim();
    let remaining = rest;
    let totalSeconds = 0;
    const timeRe =
      /^\s*(\d+(?:\.\d+)?)\s*(hours|hour|hrs|hr|minutes|minute|mins|min|h(?![a-z])|m(?![a-z]))\s*/i;
    let timeMatch;
    while ((timeMatch = remaining.match(timeRe)) && totalSeconds < 1e7) {
      const num = parseFloat(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase()[0];
      totalSeconds += unit === "h" ? num * 3600 : num * 60;
      remaining = remaining.slice(timeMatch[0].length);
    }
    let seconds = null;
    let text = "";
    if (totalSeconds > 0) {
      seconds = Math.round(totalSeconds);
      text = remaining.trim();
    } else {
      const numMatch = rest.match(/^(\d+)\s*(.*)$/);
      if (numMatch) {
        seconds = parseInt(numMatch[1], 10);
        text = numMatch[2].trim();
      }
    }
    if (seconds !== null && max > 0) {
      return {
        type: "milestoneAdd",
        seconds: Math.min(seconds, max),
        text,
      };
    }
    return null;
  }

  match = msg.match(/^!bar\s+milestone\s+remove\s+(\d+)\s*$/i);
  if (match) {
    return { type: "milestoneRemove", index: parseInt(match[1], 10) - 1 };
  }

  return null;
}
