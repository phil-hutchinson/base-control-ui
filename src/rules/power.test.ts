import { describe, expect, it } from "vitest";
import {
  gainPower,
  isPowerLevel,
  MAX_POWER,
  MIN_POWER,
  spendPower,
} from "./power";

describe("isPowerLevel", () => {
  it("accepts every valid power level", () => {
    expect(isPowerLevel(0)).toBe(true);
    expect(isPowerLevel(1)).toBe(true);
    expect(isPowerLevel(2)).toBe(true);
    expect(isPowerLevel(3)).toBe(true);
    expect(isPowerLevel(4)).toBe(true);
    expect(isPowerLevel(5)).toBe(true);
    expect(isPowerLevel(6)).toBe(true);
  });

  it("rejects a level below the minimum", () => {
    expect(isPowerLevel(-1)).toBe(false);
  });

  it("rejects a level above the maximum", () => {
    expect(isPowerLevel(7)).toBe(false);
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

describe("spendPower", () => {
  it("subtracts the cost from the power carried", () => {
    expect(spendPower(4, 2)).toBe(2);
    expect(spendPower(1, 1)).toBe(0);
    expect(spendPower(6, 0)).toBe(6);
  });

  it("throws rather than return a power level below the minimum", () => {
    expect(() => spendPower(1, 2)).toThrow(RangeError);
    expect(() => spendPower(0, 1)).toThrow(RangeError);
  });
});

describe("gainPower", () => {
  it("adds the rate to the power carried, capped at the maximum", () => {
    expect(gainPower(4, 2)).toEqual({ power: 6, amount: 2 });
    expect(gainPower(5, 2)).toEqual({ power: 6, amount: 1 });
    expect(gainPower(6, 1)).toEqual({ power: 6, amount: 0 });
  });
});
