import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderMilestones } from "../../src/public/js/bar/render.js";

function setupContainer() {
  const container = document.createElement("div");
  container.id = "progressContainer";
  container.style.position = "relative";
  container.style.width = "500px";
  container.style.height = "60px";
  document.body.appendChild(container);
}

function cleanupContainer() {
  const el = document.getElementById("progressContainer");
  if (el) el.remove();
}

describe("renderMilestones", () => {
  beforeEach(setupContainer);
  afterEach(cleanupContainer);

  const baseParams = {
    barWidth: "500",
    barHeight: "60",
    orientation: "horizontal",
    max: 3600,
    msLabelOffsetX: "0",
    msLabelOffsetY: "4",
    msLabelFontSize: "14",
    msLabelAlternate: "0",
    milestones: [
      { seconds: 900, text: "25%" },
      { seconds: 1800, text: "50%" },
      { seconds: 2700, text: "75%" },
    ],
  };

  it("renders nothing when milestones is empty", () => {
    renderMilestones({ ...baseParams, milestones: [] });
    const markers = document.querySelectorAll(".milestone-marker");
    expect(markers.length).toBe(0);
  });

  it("renders nothing when max is 0", () => {
    renderMilestones({ ...baseParams, max: 0 });
    const markers = document.querySelectorAll(".milestone-marker");
    expect(markers.length).toBe(0);
  });

  it("renders milestones in the container", () => {
    renderMilestones(baseParams);
    const markers = document.querySelectorAll(".milestone-marker");
    expect(markers.length).toBe(3);
  });

  it("skips label for milestone with no text", () => {
    const params = {
      ...baseParams,
      milestones: [{ seconds: 1800, text: "" }],
    };
    renderMilestones(params);
    const markers = document.querySelectorAll(".milestone-marker");
    expect(markers.length).toBe(1);
    const labels = markers[0].querySelectorAll(".milestone-marker-label");
    expect(labels.length).toBe(0);
  });

  describe("horizontal label positions", () => {
    it("places all labels below bar when alternate is off", () => {
      renderMilestones({ ...baseParams, msLabelAlternate: "0" });
      const labels = document.querySelectorAll(".milestone-marker-label");
      expect(labels.length).toBe(3);
      labels.forEach((label) => {
        expect(label.style.top).toBe("64px");
      });
    });

    it("alternates label above/below when alternate is on", () => {
      renderMilestones({ ...baseParams, msLabelAlternate: "1" });
      const labels = document.querySelectorAll(".milestone-marker-label");
      expect(labels.length).toBe(3);

      expect(labels[0].style.top).toBe("64px");
      const expectedAbove = 0 - 14 * 1.4 - 4 + "px";
      expect(labels[1].style.top).toBe(expectedAbove);
      expect(labels[2].style.top).toBe("64px");
    });

    it("applies translateX(-50%) to all horizontal labels", () => {
      renderMilestones({ ...baseParams, msLabelAlternate: "1" });
      const labels = document.querySelectorAll(".milestone-marker-label");
      labels.forEach((label) => {
        expect(label.style.transform).toBe("translateX(-50%)");
      });
    });
  });

  describe("vertical label positions", () => {
    const vertParams = {
      ...baseParams,
      orientation: "vertical",
      barWidth: "60",
      barHeight: "500",
    };

    it("places all labels right of bar when alternate is off", () => {
      renderMilestones({ ...vertParams, msLabelAlternate: "0" });
      const labels = document.querySelectorAll(".milestone-marker-label");
      expect(labels.length).toBe(3);
      labels.forEach((label) => {
        expect(label.style.left).toBe("60px");
      });
    });

    it("alternates label right/left when alternate is on", () => {
      renderMilestones({ ...vertParams, msLabelAlternate: "1" });
      const labels = document.querySelectorAll(".milestone-marker-label");
      expect(labels.length).toBe(3);

      expect(labels[0].style.left).toBe("60px");
      expect(labels[0].style.transform).toBe("translateY(-50%)");

      expect(labels[1].style.left).toBe("0px");
      expect(labels[1].style.transform).toContain("calc(-100% - 0px)");
      expect(labels[1].style.transform).toContain("translateY(-50%)");

      expect(labels[2].style.left).toBe("60px");
      expect(labels[2].style.transform).toBe("translateY(-50%)");
    });
  });
});
