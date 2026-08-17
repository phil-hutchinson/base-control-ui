import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { squareLabel } from "./squareLabel";

describe("squareLabel", () => {
  it("names an ordinary empty square by its square name alone", () => {
    expect(squareLabel({ square: squareAt("H", 8), isBay: false })).toBe("H8");
  });

  it("adds 'bay' for an empty bay", () => {
    expect(squareLabel({ square: squareAt("D", 15), isBay: true })).toBe(
      "D15, bay",
    );
  });

  it("names an occupied bay for the green side", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isBay: true,
        occupant: "green",
      }),
    ).toBe("H15, bay, green ship");
  });

  it("names an occupied bay for the red side", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        occupant: "red",
      }),
    ).toBe("D15, bay, red ship");
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        occupant: "green",
      }),
    ).toBe("H8, green ship");
  });

  it("names each site state", () => {
    expect(
      squareLabel({
        square: squareAt("B", 4),
        isBay: false,
        siteState: "dormant",
      }),
    ).toBe("B4, dormant site");
    expect(
      squareLabel({
        square: squareAt("E", 5),
        isBay: false,
        siteState: "active",
      }),
    ).toBe("E5, active site");
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        siteState: "charged",
      }),
    ).toBe("H8, charged site");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isBay: false,
        siteState: "depleted",
      }),
    ).toBe("H4, depleted site");
  });

  it("names an occupied site for each side", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        siteState: "charged",
        occupant: "green",
      }),
    ).toBe("H8, charged site, green ship");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isBay: false,
        siteState: "depleted",
        occupant: "red",
      }),
    ).toBe("H4, depleted site, red ship");
  });
});
