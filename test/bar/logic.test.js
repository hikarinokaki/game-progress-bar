import { describe, it, expect } from "vitest";
import {
  secondsToNaturalTime,
  rectsIntersect,
  validateColor,
  validateDisplayFormat,
  validateOrientation,
  parseMilestones,
  parseTodos,
  clampMilestoneIndex,
  parseProgressCommand,
  parseTodoCommand,
  applyTodoAction,
  parseTimeExpression,
  parseBarCommand,
  findTodoIndex,
} from "../../src/public/js/bar/logic.js";

describe("secondsToNaturalTime", () => {
  it("formats hours and minutes", () => {
    expect(secondsToNaturalTime(5400)).toBe("1h 30m");
  });

  it("formats only hours", () => {
    expect(secondsToNaturalTime(7200)).toBe("2h");
  });

  it("formats only minutes", () => {
    expect(secondsToNaturalTime(1800)).toBe("30m");
  });

  it("formats only seconds", () => {
    expect(secondsToNaturalTime(45)).toBe("45s");
  });

  it("handles zero", () => {
    expect(secondsToNaturalTime(0)).toBe("0s");
  });

  it("formats mixed hours and minutes", () => {
    expect(secondsToNaturalTime(3660)).toBe("1h 1m");
  });
});

describe("rectsIntersect", () => {
  const a = { left: 0, right: 10, top: 0, bottom: 10 };

  it("detects overlapping rectangles", () => {
    const b = { left: 5, right: 15, top: 5, bottom: 15 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  it("detects non-overlapping rectangles", () => {
    const b = { left: 20, right: 30, top: 20, bottom: 30 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  it("detects edge-touching as non-overlapping", () => {
    const b = { left: 10, right: 20, top: 0, bottom: 10 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  it("handles identical rectangles", () => {
    expect(rectsIntersect(a, a)).toBe(true);
  });
});

describe("validateColor", () => {
  it("passes valid hex colors", () => {
    expect(validateColor("#ff0000", "#000")).toBe("#ff0000");
    expect(validateColor("#4CAF50", "#000")).toBe("#4CAF50");
  });

  it("returns fallback for invalid colors", () => {
    expect(validateColor("red", "#000")).toBe("#000");
    expect(validateColor("#fff", "#000")).toBe("#000");
    expect(validateColor("#12345", "#000")).toBe("#000");
    expect(validateColor("", "#000")).toBe("#000");
  });
});

describe("validateDisplayFormat", () => {
  it("passes valid formats", () => {
    expect(validateDisplayFormat("percentage")).toBe("percentage");
    expect(validateDisplayFormat("time")).toBe("time");
    expect(validateDisplayFormat("none")).toBe("none");
  });

  it("returns default for invalid formats", () => {
    expect(validateDisplayFormat("invalid")).toBe("percentage");
    expect(validateDisplayFormat("")).toBe("percentage");
  });
});

describe("validateOrientation", () => {
  it("passes valid orientations", () => {
    expect(validateOrientation("horizontal")).toBe("horizontal");
    expect(validateOrientation("vertical")).toBe("vertical");
  });

  it("returns default for invalid", () => {
    expect(validateOrientation("diagonal")).toBe("horizontal");
    expect(validateOrientation("")).toBe("horizontal");
  });
});

describe("parseMilestones", () => {
  const max = 3600;

  it("parses valid JSON milestones", () => {
    const raw = JSON.stringify([
      { seconds: 1800, text: "Halfway" },
      { seconds: 3600, text: "Done!" },
    ]);
    const result = parseMilestones(raw, max);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ seconds: 1800, text: "Halfway" });
    expect(result[1]).toEqual({ seconds: 3600, text: "Done!" });
  });

  it("clamps seconds to max", () => {
    const raw = JSON.stringify([{ seconds: 9999, text: "Over" }]);
    const result = parseMilestones(raw, max);
    expect(result[0].seconds).toBe(3600);
  });

  it("filters out empty milestones", () => {
    const raw = JSON.stringify([{ seconds: 0, text: "" }]);
    expect(parseMilestones(raw, max)).toHaveLength(0);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseMilestones("not-json", max)).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseMilestones('{"key":"val"}', max)).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseMilestones(null, max)).toEqual([]);
    expect(parseMilestones(undefined, max)).toEqual([]);
  });
});

describe("parseTodos", () => {
  it("parses valid JSON todos", () => {
    const raw = JSON.stringify([
      { text: "Task 1", done: false },
      { text: "Task 2", done: true },
    ]);
    const result = parseTodos(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ text: "Task 1", done: false });
    expect(result[1]).toEqual({ text: "Task 2", done: true });
  });

  it("filters out empty text", () => {
    const raw = JSON.stringify([{ text: "", done: false }]);
    expect(parseTodos(raw)).toHaveLength(0);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseTodos("not-json")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseTodos(null)).toEqual([]);
    expect(parseTodos(undefined)).toEqual([]);
  });
});

describe("clampMilestoneIndex", () => {
  const milestones = [{ seconds: 100, text: "A" }];

  it("returns index when valid", () => {
    expect(clampMilestoneIndex(0, milestones)).toBe(0);
  });

  it("returns -1 for out of bounds", () => {
    expect(clampMilestoneIndex(-1, milestones)).toBe(-1);
    expect(clampMilestoneIndex(5, milestones)).toBe(-1);
  });
});

describe("parseProgressCommand", () => {
  const milestones = [
    { seconds: 1800, text: "Half" },
    { seconds: 3600, text: "Full" },
  ];

  it("parses valid !progress milestone commands", () => {
    expect(
      parseProgressCommand("!progress milestone 1", milestones, 7200),
    ).toBe(1800);
    expect(
      parseProgressCommand("!progress milestone 2", milestones, 7200),
    ).toBe(3600);
  });

  it("clamps to max", () => {
    const m = [{ seconds: 9999, text: "Over" }];
    expect(parseProgressCommand("!progress milestone 1", m, 5000)).toBe(5000);
  });

  it("returns null for non-matching messages", () => {
    expect(parseProgressCommand("hello", milestones, 7200)).toBeNull();
    expect(parseProgressCommand("!todo 1 done", milestones, 7200)).toBeNull();
  });

  it("returns null for out-of-range index", () => {
    expect(
      parseProgressCommand("!progress milestone 0", milestones, 7200),
    ).toBeNull();
    expect(
      parseProgressCommand("!progress milestone 99", milestones, 7200),
    ).toBeNull();
  });

  it("returns null if max is 0", () => {
    expect(
      parseProgressCommand("!progress milestone 1", milestones, 0),
    ).toBeNull();
  });

  it("returns null for empty message", () => {
    expect(parseProgressCommand("", milestones, 7200)).toBeNull();
  });
});

describe("parseTodoCommand", () => {
  it("parses done action", () => {
    expect(parseTodoCommand("!todo 1 done")).toEqual({
      index: 0,
      action: "done",
    });
    expect(parseTodoCommand("!todo 1 check")).toEqual({
      index: 0,
      action: "done",
    });
  });

  it("parses undone action", () => {
    expect(parseTodoCommand("!todo 1 undone")).toEqual({
      index: 0,
      action: "undone",
    });
    expect(parseTodoCommand("!todo 1 uncheck")).toEqual({
      index: 0,
      action: "undone",
    });
  });

  it("parses toggle action", () => {
    expect(parseTodoCommand("!todo 1 toggle")).toEqual({
      index: 0,
      action: "toggle",
    });
  });

  it("handles 1-indexed to 0-indexed conversion", () => {
    expect(parseTodoCommand("!todo 5 done")).toEqual({
      index: 4,
      action: "done",
    });
  });

  it("returns null for non-matching messages", () => {
    expect(parseTodoCommand("hello")).toBeNull();
    expect(parseTodoCommand("!todo 1")).toBeNull();
    expect(parseTodoCommand("!todo abc done")).toBeNull();
  });

  it("returns null for empty message", () => {
    expect(parseTodoCommand("")).toBeNull();
  });
});

describe("applyTodoAction", () => {
  const todos = [
    { text: "Task A", done: false },
    { text: "Task B", done: true },
  ];

  it("sets done", () => {
    const result = applyTodoAction(todos, 0, "done");
    expect(result[0].done).toBe(true);
    expect(result[1].done).toBe(true);
  });

  it("sets undone", () => {
    const result = applyTodoAction(todos, 1, "undone");
    expect(result[0].done).toBe(false);
    expect(result[1].done).toBe(false);
  });

  it("toggles", () => {
    const result = applyTodoAction(todos, 0, "toggle");
    expect(result[0].done).toBe(true);
    const result2 = applyTodoAction(todos, 1, "toggle");
    expect(result2[1].done).toBe(false);
  });

  it("does not mutate original array", () => {
    const copy = todos.slice();
    applyTodoAction(todos, 0, "done");
    expect(todos).toEqual(copy);
  });

  it("returns null for out of bounds", () => {
    expect(applyTodoAction(todos, -1, "done")).toBeNull();
    expect(applyTodoAction(todos, 99, "done")).toBeNull();
  });

  it("returns null for null todos", () => {
    expect(applyTodoAction(null, 0, "done")).toBeNull();
  });
});

describe("parseTimeExpression", () => {
  it("parses hours and minutes format", () => {
    expect(parseTimeExpression("1h 30m")).toBe(5400);
  });

  it("parses hours only", () => {
    expect(parseTimeExpression("2 hours")).toBe(7200);
  });

  it("parses minutes only", () => {
    expect(parseTimeExpression("30min")).toBe(1800);
  });

  it("parses implicit format (1h30)", () => {
    expect(parseTimeExpression("1h30")).toBe(5400);
  });

  it("handles bare number as seconds", () => {
    expect(parseTimeExpression("3600")).toBe(3600);
  });

  it("handles zero", () => {
    expect(parseTimeExpression("0")).toBe(0);
  });

  it("returns null for empty string", () => {
    expect(parseTimeExpression("")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseTimeExpression("foobar")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseTimeExpression(null)).toBeNull();
    expect(parseTimeExpression(undefined)).toBeNull();
  });
});

describe("parseBarCommand", () => {
  const milestones = [
    { seconds: 1800, text: "Half" },
    { seconds: 3600, text: "Full" },
  ];

  it("parses !bar set with seconds", () => {
    expect(parseBarCommand("!bar set 500", milestones, 7200)).toEqual({
      type: "set",
      value: 500,
    });
  });

  it("parses !bar set with time expression", () => {
    expect(parseBarCommand("!bar set 1h 30m", milestones, 7200)).toEqual({
      type: "set",
      value: 5400,
    });
  });

  it("clamps !bar set value to max", () => {
    expect(parseBarCommand("!bar set 99999", milestones, 5000)).toEqual({
      type: "set",
      value: 5000,
    });
  });

  it("parses !bar set milestone <n>", () => {
    expect(parseBarCommand("!bar set milestone 1", milestones, 7200)).toEqual({
      type: "setMilestone",
      index: 0,
    });
    expect(parseBarCommand("!bar set milestone 2", milestones, 7200)).toEqual({
      type: "setMilestone",
      index: 1,
    });
  });

  it("returns null for !bar set milestone with out-of-range index", () => {
    expect(
      parseBarCommand("!bar set milestone 0", milestones, 7200),
    ).toBeNull();
    expect(
      parseBarCommand("!bar set milestone 99", milestones, 7200),
    ).toBeNull();
  });

  it("returns null for !bar set milestone with empty milestones", () => {
    expect(parseBarCommand("!bar set milestone 1", [], 7200)).toBeNull();
  });

  it("returns null for !bar set with invalid value", () => {
    expect(parseBarCommand("!bar set foobar", milestones, 7200)).toBeNull();
  });

  it("parses !bar pause", () => {
    expect(parseBarCommand("!bar pause", milestones, 7200)).toEqual({
      type: "pause",
    });
  });

  it("parses !bar resume", () => {
    expect(parseBarCommand("!bar resume", milestones, 7200)).toEqual({
      type: "resume",
    });
  });

  it("parses !bar todo <n> done", () => {
    expect(parseBarCommand("!bar todo 1 done", milestones, 7200)).toEqual({
      type: "todoAction",
      id: "1",
      action: "done",
    });
  });

  it("parses !bar todo <n> toggle", () => {
    expect(parseBarCommand("!bar todo 1 toggle", milestones, 7200)).toEqual({
      type: "todoAction",
      id: "1",
      action: "toggle",
    });
  });

  it("parses !bar todo <n> check as done", () => {
    expect(parseBarCommand("!bar todo 1 check", milestones, 7200)).toEqual({
      type: "todoAction",
      id: "1",
      action: "done",
    });
  });

  it("parses !bar todo add <text>", () => {
    expect(parseBarCommand("!bar todo add Buy milk", milestones, 7200)).toEqual(
      {
        type: "todoAdd",
        text: "Buy milk",
      },
    );
  });

  it("parses !bar todo delete <n>", () => {
    expect(parseBarCommand("!bar todo delete 3", milestones, 7200)).toEqual({
      type: "todoDelete",
      id: "3",
    });
  });

  it("parses !bar todo with quoted id", () => {
    expect(
      parseBarCommand('!bar todo "dragon boss" done', milestones, 7200),
    ).toEqual({
      type: "todoAction",
      id: "dragon boss",
      action: "done",
    });
  });

  it("parses !bar todo with unquoted fuzzy id", () => {
    expect(
      parseBarCommand("!bar todo dragon boss toggle", milestones, 7200),
    ).toEqual({
      type: "todoAction",
      id: "dragon boss",
      action: "toggle",
    });
  });

  it("parses !bar todo delete with quoted id", () => {
    expect(
      parseBarCommand('!bar todo delete "dragon boss"', milestones, 7200),
    ).toEqual({
      type: "todoDelete",
      id: "dragon boss",
    });
  });

  it("parses !bar todo delete with unquoted fuzzy id", () => {
    expect(
      parseBarCommand("!bar todo delete dragon boss", milestones, 7200),
    ).toEqual({
      type: "todoDelete",
      id: "dragon boss",
    });
  });

  it("handles quoted todo with id containing spaces", () => {
    expect(
      parseBarCommand(
        '!bar todo "something with spaces" undone',
        milestones,
        7200,
      ),
    ).toEqual({
      type: "todoAction",
      id: "something with spaces",
      action: "undone",
    });
  });

  it("parses !bar milestone add <seconds> [label]", () => {
    expect(
      parseBarCommand("!bar milestone add 1800 Halfway", milestones, 7200),
    ).toEqual({
      type: "milestoneAdd",
      seconds: 1800,
      text: "Halfway",
    });
  });

  it("parses !bar milestone add without label", () => {
    expect(
      parseBarCommand("!bar milestone add 3600", milestones, 7200),
    ).toEqual({
      type: "milestoneAdd",
      seconds: 3600,
      text: "",
    });
  });

  it("parses !bar milestone add with time expression", () => {
    expect(
      parseBarCommand("!bar milestone add 1h 30m Mid", milestones, 7200),
    ).toEqual({
      type: "milestoneAdd",
      seconds: 5400,
      text: "Mid",
    });
  });

  it("parses !bar milestone add with implicit format", () => {
    expect(
      parseBarCommand("!bar milestone add 1h30m Implicit", milestones, 7200),
    ).toEqual({
      type: "milestoneAdd",
      seconds: 5400,
      text: "Implicit",
    });
  });

  it("clamps !bar milestone add seconds to max", () => {
    expect(
      parseBarCommand("!bar milestone add 99999 Over", milestones, 5000),
    ).toEqual({
      type: "milestoneAdd",
      seconds: 5000,
      text: "Over",
    });
  });

  it("parses !bar milestone remove <n>", () => {
    expect(
      parseBarCommand("!bar milestone remove 2", milestones, 7200),
    ).toEqual({
      type: "milestoneRemove",
      index: 1,
    });
  });

  it("returns null for !bar milestone add with invalid value", () => {
    expect(
      parseBarCommand("!bar milestone add foobar", milestones, 7200),
    ).toBeNull();
  });

  it("returns null for unknown !bar subcommand", () => {
    expect(parseBarCommand("!bar unknown", milestones, 7200)).toBeNull();
  });

  it("returns null for non-!bar messages", () => {
    expect(parseBarCommand("hello", milestones, 7200)).toBeNull();
    expect(
      parseBarCommand("!progress milestone 1", milestones, 7200),
    ).toBeNull();
    expect(parseBarCommand("!todo 1 done", milestones, 7200)).toBeNull();
  });

  it("returns null for empty message", () => {
    expect(parseBarCommand("", milestones, 7200)).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseBarCommand(null, milestones, 7200)).toBeNull();
    expect(parseBarCommand(undefined, milestones, 7200)).toBeNull();
  });

  it("returns null when max is 0", () => {
    expect(parseBarCommand("!bar set 500", milestones, 0)).toBeNull();
    expect(parseBarCommand("!bar set milestone 1", milestones, 0)).toBeNull();
    expect(
      parseBarCommand("!bar milestone add 1800", milestones, 0),
    ).toBeNull();
  });
});

describe("findTodoIndex", () => {
  const todos = [
    { text: "Defeat the dragon boss", done: false },
    { text: "Collect 10 herbs", done: false },
    { text: "Upgrade sword", done: true },
  ];

  it("resolves numeric index (1-indexed)", () => {
    expect(findTodoIndex(todos, "1")).toBe(0);
    expect(findTodoIndex(todos, "2")).toBe(1);
    expect(findTodoIndex(todos, "3")).toBe(2);
  });

  it("returns -1 for out-of-range numeric", () => {
    expect(findTodoIndex(todos, "4")).toBe(-1);
    expect(findTodoIndex(todos, "99")).toBe(-1);
  });

  it("fuzzy matches by substring", () => {
    expect(findTodoIndex(todos, "dragon")).toBe(0);
    expect(findTodoIndex(todos, "boss")).toBe(0);
    expect(findTodoIndex(todos, "herbs")).toBe(1);
    expect(findTodoIndex(todos, "sword")).toBe(2);
  });

  it("fuzzy match is case-insensitive", () => {
    expect(findTodoIndex(todos, "DRAGON")).toBe(0);
    expect(findTodoIndex(todos, "Herbs")).toBe(1);
    expect(findTodoIndex(todos, "SWORD")).toBe(2);
  });

  it("returns -1 for non-matching fuzzy", () => {
    expect(findTodoIndex(todos, "xyzzy")).toBe(-1);
    expect(findTodoIndex(todos, "nonexistent")).toBe(-1);
  });

  it("returns first match when multiple todos contain the string", () => {
    const dupes = [
      { text: "alpha beta", done: false },
      { text: "beta gamma", done: false },
    ];
    expect(findTodoIndex(dupes, "beta")).toBe(0);
  });

  it("returns -1 for null todos", () => {
    expect(findTodoIndex(null, "1")).toBe(-1);
  });

  it("returns -1 for null id", () => {
    expect(findTodoIndex(todos, null)).toBe(-1);
  });
});
