import { describe, expect, it } from "vitest";
import { isPowerLevel, MAX_POWER, MIN_POWER } from "./power";

describe("isPowerLevel", () => {
  it("accepts every valid power level", () => {
    expect(isPowerLevel(0)).toBe(true);
    expect(isPowerLevel(1)).toBe(true);
    expect(isPowerLevel(2)).toBe(true);
    expect(isPowerLevel(3)).toBe(true);
    expect(isPowerLevel(4)).toBe(true);
  });

  it("rejects a level below the minimum", () => {
    expect(isPowerLevel(-1)).toBe(false);
  });

  it("rejects a level above the maximum", () => {
    expect(isPowerLevel(5)).toBe(false);
  });

  it("rejects a non-integer level", () => {
    expect(isPowerLevel(1.5)).toBe(false);
  });

  it("agrees with the named bounds", () => {
    expect(isPowerLevel(MIN_POWER)).toBe(true);
    expect(isPowerLevel(MAX_POWER)).toBe(true);
    expect(isPowerLevel(MIN_POWER - 1)).toBe(false);
    expect(isPowerLevel(MAX_POWER + 1)).toBe(false);
  });
});
