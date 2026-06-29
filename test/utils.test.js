import { describe, it, expect } from "vitest";
import {
  clamp,
  calculatePercent,
  secondsToText,
  parseTimeToSeconds,
  addScroll,
} from "../src/public/js/utils.js";

describe("clamp", () => {
  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles edge equality", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("calculatePercent", () => {
  it("returns 0 when max is 0", () => {
    expect(calculatePercent(50, 0)).toBe(0);
  });

  it("calculates correct percentage", () => {
    expect(calculatePercent(25, 100)).toBe(25);
    expect(calculatePercent(50, 200)).toBe(25);
  });

  it("rounds to nearest integer", () => {
    expect(calculatePercent(33, 100)).toBe(33);
    expect(calculatePercent(1, 3)).toBe(33);
  });
});

describe("secondsToText", () => {
  it("formats hours and minutes", () => {
    expect(secondsToText(5400)).toBe("1h 30m");
  });

  it("formats only hours", () => {
    expect(secondsToText(7200)).toBe("2h");
  });

  it("formats only minutes", () => {
    expect(secondsToText(1800)).toBe("30m");
  });

  it("formats minutes under 60", () => {
    expect(secondsToText(600)).toBe("10m");
  });

  it("handles zero", () => {
    expect(secondsToText(0)).toBe("0m");
  });
});

describe("parseTimeToSeconds", () => {
  it("parses hours and minutes", () => {
    expect(parseTimeToSeconds("1h 30m")).toBe(5400);
  });

  it("parses only hours", () => {
    expect(parseTimeToSeconds("2 hours")).toBe(7200);
  });

  it("parses only minutes", () => {
    expect(parseTimeToSeconds("30min")).toBe(1800);
  });

  it("parses implicit format", () => {
    expect(parseTimeToSeconds("1h30")).toBe(5400);
  });

  it("returns null for empty input", () => {
    expect(parseTimeToSeconds("")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseTimeToSeconds("foobar")).toBeNull();
  });
});

describe("addScroll", () => {
  it("attaches wheel listener and calls callback with correct delta", () => {
    let result = 0;
    const el = document.createElement("div");
    addScroll(el, (delta) => {
      result = delta;
    });

    const wheelEvent = new WheelEvent("wheel", { deltaY: -100 });
    el.dispatchEvent(wheelEvent);
    expect(result).toBe(1);

    const wheelEvent2 = new WheelEvent("wheel", { deltaY: 100 });
    el.dispatchEvent(wheelEvent2);
    expect(result).toBe(-1);
  });
});
