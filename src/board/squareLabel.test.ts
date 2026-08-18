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

  it("names an occupied bay for the green side, stating zero shields", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isBay: true,
        occupant: { side: "green", shields: 0 },
      }),
    ).toBe("H15, bay, green ship, 0 shields");
  });

  it("uses the singular at one shield", () => {
    expect(
      squareLabel({
        square: squareAt("L", 15),
        isBay: true,
        occupant: { side: "red", shields: 1 },
      }),
    ).toBe("L15, bay, red ship, 1 shield");
  });

  it("uses the plural at a middle count", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        occupant: { side: "red", shields: 3 },
      }),
    ).toBe("D15, bay, red ship, 3 shields");
  });

  it("names an occupied ordinary square, for completeness of the contract", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        occupant: { side: "green", shields: 4 },
      }),
    ).toBe("H8, green ship, 4 shields");
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

  it("names an unmarked square exactly as before, when no mark is given", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        occupant: { side: "green", shields: 0 },
      }),
    ).toBe("H8, green ship, 0 shields");
  });

  it("adds 'selected' last, after the shield count", () => {
    expect(
      squareLabel({
        square: squareAt("G", 7),
        isBay: false,
        occupant: { side: "green", shields: 0 },
        mark: "selected",
      }),
    ).toBe("G7, green ship, 0 shields, selected");
  });

  it("adds 'already moved this turn' when hasMoved is true, after the shield count", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasMoved: true,
      }),
    ).toBe("M10, green ship, 4 shields, already moved this turn");
  });

  it("says nothing about having moved when hasMoved is false or absent", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasMoved: false,
      }),
    ).toBe("M10, green ship, 4 shields");
  });

  it("combines having moved with the no-action condition, moved first", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasMoved: true,
        condition: "no-action",
      }),
    ).toBe(
      "M10, green ship, 4 shields, already moved this turn, no action available this turn",
    );
  });

  it("adds 'no action available this turn' as the condition", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        condition: "no-action",
      }),
    ).toBe("M10, green ship, 4 shields, no action available this turn");
  });

  it("adds 'stranded, must move this turn' as the condition", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        condition: "owes-action",
      }),
    ).toBe("M10, green ship, 4 shields, stranded, must move this turn");
  });

  it("puts the condition before the mark, when a square carries both", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        condition: "owes-action",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, 4 shields, stranded, must move this turn, selected",
    );
  });

  it("orders having moved, the condition and the mark: shields, moved, condition, mark", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 2 },
        hasMoved: true,
        condition: "no-action",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, 2 shields, already moved this turn, no action available this turn, selected",
    );
  });

  it("adds 'can move here' last, on an empty site square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        siteState: "charged",
        mark: "destination",
      }),
    ).toBe("H8, charged site, can move here");
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

  it("names an occupied site for each side, with its shield count", () => {
    expect(
      squareLabel({
        square: squareAt("H", 8),
        isBay: false,
        siteState: "charged",
        occupant: { side: "green", shields: 2 },
      }),
    ).toBe("H8, charged site, green ship, 2 shields");
    expect(
      squareLabel({
        square: squareAt("H", 4),
        isBay: false,
        siteState: "depleted",
        occupant: { side: "red", shields: 0 },
      }),
    ).toBe("H4, depleted site, red ship, 0 shields");
  });
});
