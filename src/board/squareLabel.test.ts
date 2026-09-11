import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { squareLabel } from "./squareLabel";

describe("squareLabel", () => {
  it("names an ordinary empty square by its square name alone", () => {
    expect(squareLabel({ square: squareAt("H", 8), isPlanet: false })).toBe(
      "H8",
    );
  });

  it("adds 'planet' for an empty planet", () => {
    expect(squareLabel({ square: squareAt("D", 15), isPlanet: true })).toBe(
      "D15, planet",
    );
  });

  it("names an occupied planet for the green side, stating zero power", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isPlanet: true,
        occupant: { side: "green", power: 0 },
      }),
    ).toBe("H15, planet, green ship, power 0 of 6");
  });

  it("reads the same shape at any power level", () => {
    expect(
      squareLabel({
        square: squareAt("L", 15),
        isPlanet: true,
        occupant: { side: "red", power: 1 },
      }),
    ).toBe("L15, planet, red ship, power 1 of 6");
  });

  it("reads the same shape at a middle level", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isPlanet: true,
        occupant: { side: "red", power: 3 },
      }),
    ).toBe("D15, planet, red ship, power 3 of 6");
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isPlanet: false,
        occupant: { side: "green", power: 4 },
      }),
    ).toBe("H8, green ship, power 4 of 6");
  });

  it("names each node state", () => {
    expect(
      squareLabel({
        square: squareAt("E", 5),
        isPlanet: false,
        nodeState: "inactive",
      }),
    ).toBe("E5, inactive node");
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isPlanet: false,
        nodeState: "charged",
      }),
    ).toBe("H8, charged node");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isPlanet: false,
        nodeState: "depleted",
      }),
    ).toBe("H4, depleted node");
  });

  it("names an unmarked square exactly as before, when no mark is given", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isPlanet: false,
        occupant: { side: "green", power: 0 },
      }),
    ).toBe("H8, green ship, power 0 of 6");
  });

  it("adds 'selected' last, after the power level", () => {
    expect(
      squareLabel({
        square: squareAt("G", 7),
        isPlanet: false,
        occupant: { side: "green", power: 0 },
        mark: "selected",
      }),
    ).toBe("G7, green ship, power 0 of 6, selected");
  });

  it("adds 'cannot move or attack this turn' as the condition", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isPlanet: false,
        occupant: { side: "green", power: 4 },
        condition: "cannot-move-or-attack",
      }),
    ).toBe("M10, green ship, power 4 of 6, cannot move or attack this turn");
  });

  it("puts the condition before the mark, when a square carries both", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isPlanet: false,
        occupant: { side: "green", power: 4 },
        condition: "cannot-move-or-attack",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, power 4 of 6, cannot move or attack this turn, selected",
    );
  });

  it("adds 'can move here' last, on an empty node square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isPlanet: false,
        nodeState: "charged",
        mark: "destination",
      }),
    ).toBe("H8, charged node, can move here");
  });

  it("adds 'can move here' last, on a plain empty square", () => {
    expect(
      squareLabel({
        square: squareAt("G", 7),
        isPlanet: false,
        mark: "destination",
      }),
    ).toBe("G7, can move here");
  });

  it("adds 'can move here' last, on an empty planet", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isPlanet: true,
        mark: "destination",
      }),
    ).toBe("D15, planet, can move here");
  });

  it("names the one target outcome, last, after the power level", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isPlanet: false,
        occupant: { side: "red", power: 1 },
        mark: "target",
      }),
    ).toBe(
      "H9, red ship, power 1 of 6, can attack here, both ships would return to planets",
    );
  });

  it("names the target outcome the same way whatever power the occupant carries", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isPlanet: false,
        occupant: { side: "red", power: 4 },
        mark: "target",
      }),
    ).toBe(
      "H9, red ship, power 4 of 6, can attack here, both ships would return to planets",
    );
  });

  it("names an occupied node for each side, with its power level", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isPlanet: false,
        nodeState: "charged",
        occupant: { side: "green", power: 2 },
      }),
    ).toBe("H8, charged node, green ship, power 2 of 6");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isPlanet: false,
        nodeState: "depleted",
        occupant: { side: "red", power: 0 },
      }),
    ).toBe("H4, depleted node, red ship, power 0 of 6");
  });
});
