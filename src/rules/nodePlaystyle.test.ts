import { describe, expect, it } from "vitest";
import {
  DEFAULT_NODE_PLAYSTYLE,
  isNodePlaystyle,
  NODE_PLAYSTYLES,
} from "./nodePlaystyle";

describe("the offered node playstyles (rules.md §8.2)", () => {
  it("offers continuous, planet, dedicated and steal, steal last", () => {
    expect(NODE_PLAYSTYLES).toEqual([
      "continuous",
      "planet",
      "dedicated",
      "steal",
    ]);
  });

  it("defaults to planet rotation", () => {
    expect(DEFAULT_NODE_PLAYSTYLE).toBe("planet");
    expect(NODE_PLAYSTYLES).toContain(DEFAULT_NODE_PLAYSTYLE);
  });

  it("accepts all four offered settings", () => {
    for (const setting of NODE_PLAYSTYLES) {
      expect(isNodePlaystyle(setting)).toBe(true);
    }
  });

  it("rejects anything that is not one of them", () => {
    for (const value of [
      "CONTINUOUS",
      "planets",
      "rotator",
      0,
      1,
      null,
      undefined,
      {},
    ]) {
      expect(isNodePlaystyle(value)).toBe(false);
    }
  });
});
