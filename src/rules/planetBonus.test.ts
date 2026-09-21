import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANET_BONUS,
  isPlanetBonusSetting,
  PLANET_BONUS_SETTINGS,
  planetBonusPoints,
} from "./planetBonus";

describe("the offered planet bonus settings (rules.md §3.4)", () => {
  it("offers off, two and three, off first", () => {
    expect(PLANET_BONUS_SETTINGS).toEqual(["off", "two", "three"]);
  });

  it("defaults to off", () => {
    expect(DEFAULT_PLANET_BONUS).toBe("off");
    expect(PLANET_BONUS_SETTINGS).toContain(DEFAULT_PLANET_BONUS);
  });

  it("accepts all three offered settings", () => {
    for (const setting of PLANET_BONUS_SETTINGS) {
      expect(isPlanetBonusSetting(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of ["OFF", "twos", "four", 0, 2, 3, null, undefined, {}]) {
      expect(isPlanetBonusSetting(value)).toBe(false);
    }
  });
});

describe("planetBonusPoints (rules.md §3.4)", () => {
  it("pays nothing when off", () => {
    expect(planetBonusPoints("off")).toBe(0);
  });

  it("pays 2 under two", () => {
    expect(planetBonusPoints("two")).toBe(2);
  });

  it("pays 3 under three", () => {
    expect(planetBonusPoints("three")).toBe(3);
  });
});
