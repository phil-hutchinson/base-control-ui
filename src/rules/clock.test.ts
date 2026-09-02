import { describe, expect, it } from "vitest";
import {
  CLOCK_SETTINGS,
  DEFAULT_CLOCK_SETTING,
  isClockSetting,
  startingBudgetMs,
} from "./clock";

describe("CLOCK_SETTINGS", () => {
  it("offers no clock, 6, 4 and 2 seconds a turn, no clock first", () => {
    expect(CLOCK_SETTINGS).toEqual(["none", 6, 4, 2]);
  });

  it("includes the default", () => {
    expect(CLOCK_SETTINGS).toContain(DEFAULT_CLOCK_SETTING);
  });
});

describe("DEFAULT_CLOCK_SETTING", () => {
  it("is no clock (rules.md §10)", () => {
    expect(DEFAULT_CLOCK_SETTING).toBe("none");
  });
});

describe("isClockSetting", () => {
  it.each(CLOCK_SETTINGS)("accepts %s", (value) => {
    expect(isClockSetting(value)).toBe(true);
  });

  it.each([0, 8, 1, "6", null, undefined])("rejects %s", (value) => {
    expect(isClockSetting(value)).toBe(false);
  });
});

describe("startingBudgetMs", () => {
  it("budgets a thirty-round game at 6s a turn at 3:00", () => {
    expect(startingBudgetMs(30, 6)).toBe(180_000);
  });

  it("budgets a thirty-round game at 2s a turn at 1:00", () => {
    expect(startingBudgetMs(30, 2)).toBe(60_000);
  });

  it("budgets a ninety-round game at 6s a turn at 9:00", () => {
    expect(startingBudgetMs(90, 6)).toBe(540_000);
  });

  it.each([30, 45, 60, 90, 3])(
    "budgets a %i-round game at no clock as infinite",
    (lengthInRounds) => {
      expect(startingBudgetMs(lengthInRounds, "none")).toBe(
        Number.POSITIVE_INFINITY,
      );
    },
  );

  it("throws on a length that is not a positive whole number", () => {
    expect(() => startingBudgetMs(0, 6)).toThrow(RangeError);
    expect(() => startingBudgetMs(-3, 6)).toThrow(RangeError);
    expect(() => startingBudgetMs(2.5, 6)).toThrow(RangeError);
  });
});
