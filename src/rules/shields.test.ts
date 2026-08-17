import { describe, expect, it } from "vitest";
import { isShieldCount, MAX_SHIELDS, MIN_SHIELDS } from "./shields";

describe("isShieldCount", () => {
  it("accepts every valid shield count", () => {
    expect(isShieldCount(0)).toBe(true);
    expect(isShieldCount(1)).toBe(true);
    expect(isShieldCount(2)).toBe(true);
    expect(isShieldCount(3)).toBe(true);
    expect(isShieldCount(4)).toBe(true);
  });

  it("rejects a count below the minimum", () => {
    expect(isShieldCount(-1)).toBe(false);
  });

  it("rejects a count above the maximum", () => {
    expect(isShieldCount(5)).toBe(false);
  });

  it("rejects a non-integer count", () => {
    expect(isShieldCount(1.5)).toBe(false);
  });

  it("agrees with the named bounds", () => {
    expect(isShieldCount(MIN_SHIELDS)).toBe(true);
    expect(isShieldCount(MAX_SHIELDS)).toBe(true);
    expect(isShieldCount(MIN_SHIELDS - 1)).toBe(false);
    expect(isShieldCount(MAX_SHIELDS + 1)).toBe(false);
  });
});
