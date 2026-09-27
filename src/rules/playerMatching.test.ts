import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_MATCHING,
  isPlayerMatchingSetting,
  PLAYER_MATCHING_SETTINGS,
  resolvePlayerMatching,
} from "./playerMatching";

describe("the offered player-matching settings (steal.md §9)", () => {
  it("offers off, double and required, off first", () => {
    expect(PLAYER_MATCHING_SETTINGS).toEqual(["off", "double", "required"]);
  });

  it("defaults to off", () => {
    expect(DEFAULT_PLAYER_MATCHING).toBe("off");
    expect(PLAYER_MATCHING_SETTINGS).toContain(DEFAULT_PLAYER_MATCHING);
  });

  it("accepts all three offered settings", () => {
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
