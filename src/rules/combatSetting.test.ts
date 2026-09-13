import { describe, expect, it } from "vitest";
import {
  COMBAT_SETTINGS,
  DEFAULT_COMBAT_ENABLED,
  isCombatSetting,
} from "./combatSetting";

describe("the offered combat settings (rules.md §7)", () => {
  it("offers off and on, off first", () => {
    expect(COMBAT_SETTINGS).toEqual([false, true]);
  });

  it("defaults to combat off", () => {
    expect(DEFAULT_COMBAT_ENABLED).toBe(false);
  });

  it("accepts both offered settings", () => {
    for (const setting of COMBAT_SETTINGS) {
      expect(isCombatSetting(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of ["on", "off", 0, 1, null, undefined, {}]) {
      expect(isCombatSetting(value)).toBe(false);
    }
  });
});
