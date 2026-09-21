import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING, isScoringSetting, SCORING_SETTINGS } from "./scoring";

describe("the offered scoring settings (rules.md §8.4)", () => {
  it("offers simple and bonus, simple first", () => {
    expect(SCORING_SETTINGS).toEqual(["simple", "bonus"]);
  });

  it("defaults to bonus scoring", () => {
    expect(DEFAULT_SCORING).toBe("bonus");
    expect(SCORING_SETTINGS).toContain(DEFAULT_SCORING);
  });

  it("accepts both offered settings", () => {
    for (const setting of SCORING_SETTINGS) {
      expect(isScoringSetting(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of ["SIMPLE", "bonuses", 0, 1, null, undefined, {}]) {
      expect(isScoringSetting(value)).toBe(false);
    }
  });
});
