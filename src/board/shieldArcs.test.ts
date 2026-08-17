import { describe, expect, it } from "vitest";
import { litArcPositions } from "./shieldArcs";

describe("litArcPositions", () => {
  it("lights nothing at 0 shields", () => {
    expect(litArcPositions(0)).toEqual([]);
  });

  it("lights top-right at 1 shield", () => {
    expect(litArcPositions(1)).toEqual(["top-right"]);
  });

  it("lights top-right then bottom-right at 2 shields", () => {
    expect(litArcPositions(2)).toEqual(["top-right", "bottom-right"]);
  });

  it("adds bottom-left at 3 shields", () => {
    expect(litArcPositions(3)).toEqual([
      "top-right",
      "bottom-right",
      "bottom-left",
    ]);
  });

  it("adds top-left at 4 shields, lighting every position", () => {
    expect(litArcPositions(4)).toEqual([
      "top-right",
      "bottom-right",
      "bottom-left",
      "top-left",
    ]);
  });

  it("returns a list whose length always equals the count", () => {
    for (const shields of [0, 1, 2, 3, 4] as const) {
      expect(litArcPositions(shields)).toHaveLength(shields);
    }
  });
});
