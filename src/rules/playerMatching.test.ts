import { describe, expect, it } from "vitest";
import { CHARGED_NODE_COUNTS } from "./nodes";
import {
  chargedNodeCountsForPlayerMatching,
  DEFAULT_PLAYER_MATCHING,
  isPlayerMatchingSetting,
  PLAYER_MATCHING_SETTINGS,
  resolvePlayerMatching,
  resolvePlayerMatchingChargedNodeCount,
} from "./playerMatching";

describe("the offered player-matching settings (steal.md §9)", () => {
  it("offers off, double, required and immediate, off first", () => {
    expect(PLAYER_MATCHING_SETTINGS).toEqual([
      "off",
      "double",
      "required",
      "immediate",
    ]);
  });

  it("defaults to required", () => {
    expect(DEFAULT_PLAYER_MATCHING).toBe("required");
    expect(PLAYER_MATCHING_SETTINGS).toContain(DEFAULT_PLAYER_MATCHING);
  });

  it("accepts all four offered settings", () => {
    for (const setting of PLAYER_MATCHING_SETTINGS) {
      expect(isPlayerMatchingSetting(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of [
      "OFF",
      "doubled",
      "require",
      0,
      1,
      null,
      undefined,
      {},
    ]) {
      expect(isPlayerMatchingSetting(value)).toBe(false);
    }
  });
});

describe("resolvePlayerMatching", () => {
  it("returns the remembered setting under steal", () => {
    for (const setting of PLAYER_MATCHING_SETTINGS) {
      expect(resolvePlayerMatching("steal", setting)).toBe(setting);
    }
  });

  it("returns off under continuous, planet and dedicated for every setting", () => {
    for (const nodePlaystyle of [
      "continuous",
      "planet",
      "dedicated",
    ] as const) {
      for (const setting of PLAYER_MATCHING_SETTINGS) {
        expect(resolvePlayerMatching(nodePlaystyle, setting)).toBe("off");
      }
    }
  });
});

describe("chargedNodeCountsForPlayerMatching (steal.md §1, §9)", () => {
  it("offers four or three under immediate", () => {
    expect(chargedNodeCountsForPlayerMatching("immediate")).toEqual([4, 3]);
  });

  it("offers every charged-node count under off, double and required, unchanged", () => {
    for (const setting of ["off", "double", "required"] as const) {
      expect(chargedNodeCountsForPlayerMatching(setting)).toEqual(
        CHARGED_NODE_COUNTS,
      );
    }
  });
});

describe("resolvePlayerMatchingChargedNodeCount", () => {
  it("drops a remembered 5 to 4 under steal and immediate only", () => {
    expect(resolvePlayerMatchingChargedNodeCount("steal", "immediate", 5)).toBe(
      4,
    );
  });

  it("passes the remembered count through under every other combination", () => {
    for (const nodePlaystyle of [
      "continuous",
      "planet",
      "dedicated",
      "steal",
    ] as const) {
      for (const setting of PLAYER_MATCHING_SETTINGS) {
        if (nodePlaystyle === "steal" && setting === "immediate") {
          continue;
        }
        for (const count of CHARGED_NODE_COUNTS) {
          expect(
            resolvePlayerMatchingChargedNodeCount(
              nodePlaystyle,
              setting,
              count,
            ),
          ).toBe(count);
        }
      }
    }
  });

  it("passes 4 and 3 through under steal and immediate too", () => {
    expect(resolvePlayerMatchingChargedNodeCount("steal", "immediate", 4)).toBe(
      4,
    );
    expect(resolvePlayerMatchingChargedNodeCount("steal", "immediate", 3)).toBe(
      3,
    );
  });
});
