import { describe, expect, it } from "vitest";
import { advancedBonusCaption } from "./advancedBonusCaption";

describe("advancedBonusCaption (steal.md §10)", () => {
  it("reads BONUS for every points kind, whatever the size", () => {
    expect(advancedBonusCaption("small-points")).toBe("BONUS");
    expect(advancedBonusCaption("medium-points")).toBe("BONUS");
    expect(advancedBonusCaption("large-points")).toBe("BONUS");
  });

  it("reads FUEL for Fuel", () => {
    expect(advancedBonusCaption("fuel")).toBe("FUEL");
  });

  it("reads ADD NODES for Additional nodes", () => {
    expect(advancedBonusCaption("additional-nodes")).toBe("ADD NODES");
  });

  it("reads SCRAMBLE for Node scramble", () => {
    expect(advancedBonusCaption("node-scramble")).toBe("SCRAMBLE");
  });
});
