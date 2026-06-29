import { describe, it, expect, beforeEach } from "vitest";
import {
  state,
  setStart,
  setMax,
  setPercent,
  setTitle,
  setStyle,
  setDisplayFormat,
  setAccentColor,
  setBgColor,
  setDirection,
  setInvertDisplay,
  setBarWidth,
  setBarHeight,
  setTitleX,
  setTitleY,
  setTimeX,
  setTimeY,
  setBarX,
  setBarY,
  setOrientation,
  setMaskImageUrl,
  setCanvasWidth,
  setCanvasHeight,
  setTitleFontSize,
  setTimeFontSize,
  setMilestones,
  setTodos,
  setTodoX,
  setTodoY,
  setTodoFontSize,
  setTwitchChannel,
  setTwitchUsername,
  setMsLabelOffsetX,
  setMsLabelOffsetY,
  setMsLabelFontSize,
} from "../src/public/js/state.js";

beforeEach(() => {
  state.start = 0;
  state.max = 3600;
  state.title = "";
  state.style = "progress";
  state.displayFormat = "percentage";
  state.accentColor = "#4CAF50";
  state.bgColor = "#ddd";
  state.direction = "increment";
  state.invertDisplay = false;
  state.barWidth = "500";
  state.barHeight = "60";
  state.orientation = "horizontal";
  state.canvasWidth = "1920";
  state.canvasHeight = "1080";
  state.milestones = [];
  state.todos = [];
  state.twitchChannel = "";
  state.twitchUsername = "";
  state.msLabelOffsetX = "0";
  state.msLabelOffsetY = "4";
  state.msLabelFontSize = "14";
});

describe("setStart", () => {
  it("sets start within bounds", () => {
    setStart(100);
    expect(state.start).toBe(100);
  });

  it("clamps below 0", () => {
    setStart(-10);
    expect(state.start).toBe(0);
  });

  it("clamps above max", () => {
    setStart(99999);
    expect(state.start).toBe(3600);
  });

  it("handles string input", () => {
    setStart("500");
    expect(state.start).toBe(500);
  });
});

describe("setMax", () => {
  it("sets max value", () => {
    setMax(7200);
    expect(state.max).toBe(7200);
  });

  it("clamps start to max", () => {
    state.start = 5000;
    setMax(1000);
    expect(state.start).toBe(1000);
    expect(state.max).toBe(1000);
  });

  it("clamps below 0", () => {
    setMax(-10);
    expect(state.max).toBe(0);
  });
});

describe("setPercent", () => {
  it("sets start based on percentage", () => {
    setPercent(50);
    expect(state.start).toBe(1800);
  });

  it("clamps to 0-100", () => {
    setPercent(150);
    expect(state.start).toBe(3600);
    setPercent(-50);
    expect(state.start).toBe(0);
  });

  it("handles string input", () => {
    setPercent("25");
    expect(state.start).toBe(900);
  });
});

describe("simple setters", () => {
  it("setTitle", () => {
    setTitle("My Game");
    expect(state.title).toBe("My Game");
  });

  it("setStyle", () => {
    setStyle("gradient");
    expect(state.style).toBe("gradient");
  });

  it("setDisplayFormat", () => {
    setDisplayFormat("time");
    expect(state.displayFormat).toBe("time");
  });

  it("setAccentColor", () => {
    setAccentColor("#ff0000");
    expect(state.accentColor).toBe("#ff0000");
  });

  it("setBgColor", () => {
    setBgColor("#000");
    expect(state.bgColor).toBe("#000");
  });

  it("setDirection", () => {
    setDirection("countdown");
    expect(state.direction).toBe("countdown");
  });

  it("setInvertDisplay", () => {
    setInvertDisplay(true);
    expect(state.invertDisplay).toBe(true);
  });

  it("setBarWidth", () => {
    setBarWidth("800");
    expect(state.barWidth).toBe("800");
  });

  it("setOrientation", () => {
    setOrientation("vertical");
    expect(state.orientation).toBe("vertical");
  });

  it("setMilestones", () => {
    const ms = [{ seconds: 100, text: "Test" }];
    setMilestones(ms);
    expect(state.milestones).toBe(ms);
  });

  it("setTodos", () => {
    const td = [{ text: "Task", done: false }];
    setTodos(td);
    expect(state.todos).toBe(td);
  });

  it("setTwitchChannel", () => {
    setTwitchChannel("xqc");
    expect(state.twitchChannel).toBe("xqc");
  });

  it("setTwitchUsername", () => {
    setTwitchUsername("nightbot");
    expect(state.twitchUsername).toBe("nightbot");
  });

  it("setMsLabelOffsetX", () => {
    setMsLabelOffsetX("8");
    expect(state.msLabelOffsetX).toBe("8");
  });

  it("setMsLabelOffsetY", () => {
    setMsLabelOffsetY("12");
    expect(state.msLabelOffsetY).toBe("12");
  });

  it("setMsLabelFontSize", () => {
    setMsLabelFontSize("18");
    expect(state.msLabelFontSize).toBe("18");
  });
});
