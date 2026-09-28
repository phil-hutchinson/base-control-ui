import { describe, expect, it } from "vitest";
import { activityBonusCaption } from "./activityBonusCaption";

describe("activityBonusCaption (steal.md §10)", () => {
  it("reads BONUS for every points kind, whatever the size", () => {
    expect(activityBonusCaption("small-points")).toBe("BONUS");
    expect(activityBonusCaption("medium-points")).toBe("BONUS");
    expect(activityBonusCaption("large-points")).toBe("BONUS");
  });

  it("reads FUEL for Fuel", () => {
    expect(activityBonusCaption("fuel")).toBe("FUEL");
  });

  it("reads ADD NODES for Additional nodes", () => {
    expect(activityBonusCaption("additional-nodes")).toBe("ADD NODES");
  });

  it("reads SCRAMBLE for Node scramble", () => {
    expect(activityBonusCaption("node-scramble")).toBe("SCRAMBLE");
  });
});
