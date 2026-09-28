import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANET_ACTIVITY,
  isPlanetActivitySetting,
  PLANET_ACTIVITY_SETTINGS,
  resolvePlanetActivity,
} from "./planetActivity";

describe("the offered planet activity settings (steal.md §10)", () => {
  it("offers off and race, off first", () => {
    expect(PLANET_ACTIVITY_SETTINGS).toEqual(["off", "race"]);
  });

  it("defaults to off", () => {
    expect(DEFAULT_PLANET_ACTIVITY).toBe("off");
    expect(PLANET_ACTIVITY_SETTINGS).toContain(DEFAULT_PLANET_ACTIVITY);
  });

  it("accepts every offered setting", () => {
    for (const setting of PLANET_ACTIVITY_SETTINGS) {
      expect(isPlanetActivitySetting(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of ["OFF", "RACE", "two", 0, null, undefined, {}]) {
      expect(isPlanetActivitySetting(value)).toBe(false);
    }
  });
});

describe("resolvePlanetActivity", () => {
  it("returns the remembered setting under steal", () => {
    for (const setting of PLANET_ACTIVITY_SETTINGS) {
      expect(resolvePlanetActivity("steal", setting)).toBe(setting);
    }
  });

  it("returns off under continuous, planet and dedicated for every setting", () => {
    for (const nodePlaystyle of [
      "continuous",
      "planet",
      "dedicated",
    ] as const) {
      for (const setting of PLANET_ACTIVITY_SETTINGS) {
        expect(resolvePlanetActivity(nodePlaystyle, setting)).toBe("off");
      }
    }
  });
});
