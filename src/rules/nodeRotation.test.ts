import { describe, expect, it } from "vitest";
import {
  DEFAULT_NODE_ROTATION,
  isNodeRotationSetting,
  NODE_ROTATION_SETTINGS,
} from "./nodeRotation";

describe("the offered node rotation settings (rules.md §8.2)", () => {
  it("offers continuous, planet and dedicated, continuous first", () => {
    expect(NODE_ROTATION_SETTINGS).toEqual([
      "continuous",
      "planet",
      "dedicated",
    ]);
  });

  it("defaults to continuous rotation", () => {
    expect(DEFAULT_NODE_ROTATION).toBe("continuous");
    expect(NODE_ROTATION_SETTINGS).toContain(DEFAULT_NODE_ROTATION);
  });

  it("accepts all three offered settings", () => {
    for (const setting of NODE_ROTATION_SETTINGS) {
      expect(isNodeRotationSetting(setting)).toBe(true);
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
      expect(isNodeRotationSetting(value)).toBe(false);
    }
  });
});
