import { describe, expect, it } from "vitest";
import { bonusBadgeState } from "./bonusBadge";

describe("bonusBadgeState", () => {
  it("draws nothing when the entry has never been claimed", () => {
    expect(bonusBadgeState(undefined, 1)).toBe("none");
    expect(bonusBadgeState(undefined, 50)).toBe("none");
  });

  it("draws the amount on the claiming ply", () => {
    expect(bonusBadgeState(5, 5)).toBe("amount");
  });

  it("draws the amount for one ply after the claim — the opponent's whole reply", () => {
    expect(bonusBadgeState(5, 6)).toBe("amount");
  });

  it("draws the claimed mark from two plies after the claim on", () => {
    expect(bonusBadgeState(5, 7)).toBe("claimed");
    expect(bonusBadgeState(5, 40)).toBe("claimed");
  });
});
