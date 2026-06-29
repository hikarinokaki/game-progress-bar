import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setSnapEnabled,
  getCanvasBounds,
  getBarCanvasBounds,
  getSnapCandidates,
  applySnapAbs,
  getCorner,
  isTextElement,
  parsePosition,
} from "../../src/public/js/bar/drag.js";

describe("setSnapEnabled", () => {
  it("accepts true and false", () => {
    expect(() => setSnapEnabled(true)).not.toThrow();
    expect(() => setSnapEnabled(false)).not.toThrow();
  });
});

describe("getCanvasBounds", () => {
  it("returns canvas dimensions from params", () => {
    const params = { canvasWidth: "1920", canvasHeight: "1080" };
    const bounds = getCanvasBounds(params);
    expect(bounds).toEqual({
      width: 1920,
      height: 1080,
      cx: 960,
      cy: 540,
    });
  });

  it("defaults to 1920x1080 when params are missing", () => {
    const bounds = getCanvasBounds({});
    expect(bounds).toEqual({
      width: 1920,
      height: 1080,
      cx: 960,
      cy: 540,
    });
  });
});

describe("getBarCanvasBounds", () => {
  beforeEach(() => {
    const bar = document.createElement("div");
    bar.id = "progressContainer";
    bar.style.left = "100px";
    bar.style.top = "50px";
    document.body.appendChild(bar);
  });

  afterEach(() => {
    const bar = document.getElementById("progressContainer");
    if (bar) bar.remove();
  });

  it("returns bar bounds from DOM position and params", () => {
    const params = { barWidth: "500", barHeight: "60" };
    const bounds = getBarCanvasBounds(params);
    expect(bounds).toEqual({
      left: 100,
      top: 50,
      right: 600,
      bottom: 110,
      cx: 350,
      cy: 80,
    });
  });

  it("defaults missing bar element to 0,0", () => {
    document.getElementById("progressContainer").remove();
    const params = { barWidth: "300", barHeight: "40" };
    const bounds = getBarCanvasBounds(params);
    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBe(300);
    expect(bounds.bottom).toBe(40);
  });
});

describe("getSnapCandidates", () => {
  beforeEach(() => {
    const bar = document.createElement("div");
    bar.id = "progressContainer";
    bar.style.left = "200px";
    bar.style.top = "100px";
    document.body.appendChild(bar);
  });

  afterEach(() => {
    const bar = document.getElementById("progressContainer");
    if (bar) bar.remove();
  });

  it("returns 6 candidates for progressContainer", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const candidates = getSnapCandidates(
      "progressContainer",
      { w: 50, h: 30 },
      params,
    );
    expect(candidates).toHaveLength(6);
    expect(candidates.filter((c) => c.axis === "x")).toHaveLength(3);
    expect(candidates.filter((c) => c.axis === "y")).toHaveLength(3);
  });

  it("returns 12 candidates for other elements", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const candidates = getSnapCandidates("title", { w: 50, h: 30 }, params);
    expect(candidates).toHaveLength(12);
    expect(candidates.filter((c) => c.axis === "x")).toHaveLength(6);
    expect(candidates.filter((c) => c.axis === "y")).toHaveLength(6);
  });

  it("includes bar-relative candidates for non-bar elements", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const candidates = getSnapCandidates("title", { w: 50, h: 30 }, params);
    const xValues = candidates
      .filter((c) => c.axis === "x")
      .map((c) => c.value);
    expect(xValues).toContain(200);
    expect(xValues).toContain(550);
    expect(xValues).toContain(375);
  });

  it("includes canvas edge and center for progressContainer", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const candidates = getSnapCandidates(
      "progressContainer",
      { w: 100, h: 50 },
      params,
    );
    const xValues = candidates
      .filter((c) => c.axis === "x")
      .map((c) => c.value);
    expect(xValues).toContain(0);
    expect(xValues).toContain(1820);
    expect(xValues).toContain(910);
  });
});

describe("applySnapAbs", () => {
  beforeEach(() => {
    const bar = document.createElement("div");
    bar.id = "progressContainer";
    bar.style.left = "200px";
    bar.style.top = "100px";
    document.body.appendChild(bar);
  });

  afterEach(() => {
    const bar = document.getElementById("progressContainer");
    if (bar) bar.remove();
  });

  it("returns intended position when far from snap points", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const result = applySnapAbs("title", 500, 400, params, 100, 100, {
      w: 50,
      h: 30,
    });
    expect(result[0]).toBe(500);
    expect(result[1]).toBe(400);
  });

  it("snaps x to canvas center when close", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const canvasCx = 1920 / 2;
    const elW = 100;
    const targetX = canvasCx - elW / 2;
    const result = applySnapAbs("title", targetX + 3, 400, params, 100, 100, {
      w: 100,
      h: 30,
    });
    expect(result[0]).toBe(targetX);
  });

  it("snaps y to canvas top edge when close", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    const result = applySnapAbs("title", 500, 5, params, 100, 100, {
      w: 50,
      h: 30,
    });
    expect(result[1]).toBe(0);
  });

  it("releases snap when moved far from snap point", () => {
    const params = {
      barWidth: "400",
      barHeight: "50",
      canvasWidth: "1920",
      canvasHeight: "1080",
    };
    applySnapAbs("title", 5, 5, params, 100, 100, { w: 50, h: 30 });
    const result = applySnapAbs("title", 100, 100, params, 100, 100, {
      w: 50,
      h: 30,
    });
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(100);
  });
});

describe("getCorner", () => {
  let el;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "title";
    el.style.position = "absolute";
    el.style.left = "100px";
    el.style.top = "100px";
    el.style.width = "200px";
    el.style.height = "50px";
    el.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 300,
      bottom: 150,
      width: 200,
      height: 50,
    });
    document.body.appendChild(el);

    const canvas = document.createElement("div");
    canvas.id = "bar-canvas";
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = "1920px";
    canvas.style.height = "1080px";
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1920,
      bottom: 1080,
      width: 1920,
      height: 1080,
    });
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    const els = ["title", "bar-canvas"];
    for (const id of els) {
      const e = document.getElementById(id);
      if (e) e.remove();
    }
  });

  it("detects NW corner", () => {
    expect(getCorner(el, 100, 100)).toBe("nw");
  });

  it("detects NE corner", () => {
    expect(getCorner(el, 300, 100)).toBe("ne");
  });

  it("detects SW corner", () => {
    expect(getCorner(el, 100, 150)).toBe("sw");
  });

  it("detects SE corner", () => {
    expect(getCorner(el, 300, 150)).toBe("se");
  });

  it("returns null for point not near any corner", () => {
    expect(getCorner(el, 200, 125)).toBeNull();
  });
});

describe("isTextElement", () => {
  it("returns true for title", () => {
    const el = { id: "title" };
    expect(isTextElement(el)).toBe(true);
  });

  it("returns true for percentage", () => {
    const el = { id: "percentage" };
    expect(isTextElement(el)).toBe(true);
  });

  it("returns true for todoContainer", () => {
    const el = { id: "todoContainer" };
    expect(isTextElement(el)).toBe(true);
  });

  it("returns false for progressContainer", () => {
    const el = { id: "progressContainer" };
    expect(isTextElement(el)).toBe(false);
  });

  it("returns false for unknown id", () => {
    const el = { id: "foo" };
    expect(isTextElement(el)).toBe(false);
  });
});

describe("parsePosition", () => {
  it("returns left and top from element style", () => {
    const el = document.createElement("div");
    el.style.left = "150px";
    el.style.top = "75px";
    expect(parsePosition(el)).toEqual([150, 75]);
  });

  it("defaults to 0 when style is empty", () => {
    const el = document.createElement("div");
    expect(parsePosition(el)).toEqual([0, 0]);
  });
});
