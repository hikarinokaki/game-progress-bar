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
