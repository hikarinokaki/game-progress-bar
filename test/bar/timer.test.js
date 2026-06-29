import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimer } from "../../src/public/js/bar/timer.js";

describe("createTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeParams(overrides = {}) {
    return { start: 0, max: 100, direction: "countup", ...overrides };
  }

  it("returns getCurrentValue and setCurrentValue", () => {
    const timer = createTimer(makeParams(), { onProgressChange: vi.fn() });
    expect(timer.getCurrentValue).toBeTypeOf("function");
    expect(timer.setCurrentValue).toBeTypeOf("function");
  });

  it("getCurrentValue returns initial start value", () => {
    const timer = createTimer(makeParams({ start: 42 }), {
      onProgressChange: vi.fn(),
    });
    expect(timer.getCurrentValue()).toBe(42);
  });

  it("setCurrentValue updates current value and params.start", () => {
    const params = makeParams({ start: 10 });
    const onProgressChange = vi.fn();
    const timer = createTimer(params, { onProgressChange });
    timer.setCurrentValue(50);
    expect(timer.getCurrentValue()).toBe(50);
    expect(params.start).toBe(50);
  });

  it("setCurrentValue calls onProgressChange", () => {
    const onProgressChange = vi.fn();
    const timer = createTimer(makeParams(), { onProgressChange });
    timer.setCurrentValue(30);
    expect(onProgressChange).toHaveBeenCalledWith(30);
  });

  it("does not create interval when positionMode is set", () => {
    const onProgressChange = vi.fn();
    createTimer(makeParams({ positionMode: "enabled" }), { onProgressChange });
    vi.advanceTimersByTime(5000);
    expect(onProgressChange).not.toHaveBeenCalled();
  });

  it("ticks up every second in countup mode", () => {
    const onProgressChange = vi.fn();
    createTimer(makeParams({ start: 0, max: 10 }), { onProgressChange });
    vi.advanceTimersByTime(3000);
    expect(onProgressChange).toHaveBeenCalledTimes(3);
    expect(onProgressChange).toHaveBeenLastCalledWith(3);
  });

  it("ticks down every second in countdown mode", () => {
    const onProgressChange = vi.fn();
    createTimer(makeParams({ start: 10, max: 10, direction: "countdown" }), {
      onProgressChange,
    });
    vi.advanceTimersByTime(4000);
    expect(onProgressChange).toHaveBeenCalledTimes(4);
    expect(onProgressChange).toHaveBeenLastCalledWith(6);
  });

  it("stops ticking when countup reaches max", () => {
    const onProgressChange = vi.fn();
    createTimer(makeParams({ start: 0, max: 3 }), { onProgressChange });
    vi.advanceTimersByTime(5000);
    expect(onProgressChange).toHaveBeenCalledTimes(3);
    expect(onProgressChange).toHaveBeenLastCalledWith(3);
  });

  it("stops ticking when countdown reaches 0", () => {
    const onProgressChange = vi.fn();
    createTimer(makeParams({ start: 3, max: 3, direction: "countdown" }), {
      onProgressChange,
    });
    vi.advanceTimersByTime(5000);
    expect(onProgressChange).toHaveBeenCalledTimes(3);
    expect(onProgressChange).toHaveBeenLastCalledWith(0);
  });

  it("getCurrentValue reflects ticked value", () => {
    const timer = createTimer(makeParams({ start: 0, max: 10 }), {
      onProgressChange: vi.fn(),
    });
    vi.advanceTimersByTime(2000);
    expect(timer.getCurrentValue()).toBe(2);
  });
});
