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

  it("names an occupied bay for the green side, stating zero power", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isBay: true,
        occupant: { side: "green", power: 0 },
      }),
    ).toBe("H15, bay, green ship, power 0 of 4");
  });

  it("reads the same shape at any power level", () => {
    expect(
      squareLabel({
        square: squareAt("L", 15),
        isBay: true,
        occupant: { side: "red", power: 1 },
      }),
    ).toBe("L15, bay, red ship, power 1 of 4");
  });

  it("reads the same shape at a middle level", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        occupant: { side: "red", power: 3 },
      }),
    ).toBe("D15, bay, red ship, power 3 of 4");
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        occupant: { side: "green", power: 4 },
      }),
    ).toBe("H8, green ship, power 4 of 4");
  });

  it("names each node state", () => {
    expect(
      squareLabel({
        square: squareAt("E", 5),
        isBay: false,
        nodeState: "inactive",
      }),
    ).toBe("E5, inactive node");
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        nodeState: "charged",
      }),
    ).toBe("H8, charged node");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isBay: false,
        nodeState: "depleted",
      }),
    ).toBe("H4, depleted node");
  });

  it("names an unmarked square exactly as before, when no mark is given", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        occupant: { side: "green", power: 0 },
      }),
    ).toBe("H8, green ship, power 0 of 4");
  });

  it("adds 'selected' last, after the power level", () => {
    expect(
      squareLabel({
        square: squareAt("G", 7),
        isBay: false,
        occupant: { side: "green", power: 0 },
        mark: "selected",
      }),
    ).toBe("G7, green ship, power 0 of 4, selected");
  });

  it("adds 'already acted this turn' when hasActed is true, after the power level", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 4 },
        hasActed: true,
      }),
    ).toBe("M10, green ship, power 4 of 4, already acted this turn");
  });

  it("says nothing about having acted when hasActed is false or absent", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 4 },
        hasActed: false,
      }),
    ).toBe("M10, green ship, power 4 of 4");
  });

  it("combines having acted with the no-action condition, acted first", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 4 },
        hasActed: true,
        condition: "no-action",
      }),
    ).toBe(
      "M10, green ship, power 4 of 4, already acted this turn, no action available this turn",
    );
  });

  it("adds 'no action available this turn' as the condition", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 4 },
        condition: "no-action",
      }),
    ).toBe("M10, green ship, power 4 of 4, no action available this turn");
  });

  it("puts the condition before the mark, when a square carries both", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 4 },
        condition: "no-action",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, power 4 of 4, no action available this turn, selected",
    );
  });

  it("orders having acted, the condition and the mark: power, acted, condition, mark", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", power: 2 },
        hasActed: true,
        condition: "no-action",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, power 2 of 4, already acted this turn, no action available this turn, selected",
    );
  });

  it("adds 'can move here' last, on an empty node square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        nodeState: "charged",
        mark: "destination",
      }),
    ).toBe("H8, charged node, can move here");
  });

  it("adds 'can move here' last, on a plain empty square", () => {
    expect(
      squareLabel({
        square: squareAt("G", 7),
        isBay: false,
        mark: "destination",
      }),
    ).toBe("G7, can move here");
  });

  it("adds 'can move here' last, on an empty bay", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        mark: "destination",
      }),
    ).toBe("D15, bay, can move here");
  });

  it("names the one target outcome, last, after the power level", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isBay: false,
        occupant: { side: "red", power: 1 },
        mark: "target",
      }),
    ).toBe(
      "H9, red ship, power 1 of 4, can attack here, both ships would return to bays",
    );
  });

  it("names the target outcome the same way whatever power the occupant carries", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isBay: false,
        occupant: { side: "red", power: 4 },
        mark: "target",
      }),
    ).toBe(
      "H9, red ship, power 4 of 4, can attack here, both ships would return to bays",
    );
  });

  it("names an occupied node for each side, with its power level", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        nodeState: "charged",
        occupant: { side: "green", power: 2 },
      }),
    ).toBe("H8, charged node, green ship, power 2 of 4");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isBay: false,
        nodeState: "depleted",
        occupant: { side: "red", power: 0 },
      }),
    ).toBe("H4, depleted node, red ship, power 0 of 4");
  });
});
