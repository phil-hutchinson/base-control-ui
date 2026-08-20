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

  it("adds 'already acted this turn' when hasActed is true, after the shield count", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasActed: true,
      }),
    ).toBe("M10, green ship, 4 shields, already acted this turn");
  });

  it("says nothing about having acted when hasActed is false or absent", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasActed: false,
      }),
    ).toBe("M10, green ship, 4 shields");
  });

  it("combines having acted with the no-action condition, acted first", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 4 },
        hasActed: true,
        condition: "no-action",
      }),
    ).toBe(
      "M10, green ship, 4 shields, already acted this turn, no action available this turn",
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

  it("orders having acted, the condition and the mark: shields, acted, condition, mark", () => {
    expect(
      squareLabel({
        square: squareAt("M", 10),
        isBay: false,
        occupant: { side: "green", shields: 2 },
        hasActed: true,
        condition: "no-action",
        mark: "selected",
      }),
    ).toBe(
      "M10, green ship, 2 shields, already acted this turn, no action available this turn, selected",
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

  it("names the attacker-won outcome on a target square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isBay: false,
        occupant: { side: "red", shields: 1 },
        mark: { kind: "target", outcome: "attacker-won" },
      }),
    ).toBe("H9, red ship, 1 shield, can attack here, your ship would win");
  });

  it("names the defender-won outcome on a target square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isBay: false,
        occupant: { side: "red", shields: 4 },
        mark: { kind: "target", outcome: "defender-won" },
      }),
    ).toBe("H9, red ship, 4 shields, can attack here, your ship would lose");
  });

  it("names the mutual-return outcome on a target square", () => {
    expect(
      squareLabel({
        square: squareAt("H", 9),
        isBay: false,
        occupant: { side: "red", shields: 2 },
        mark: { kind: "target", outcome: "mutual-return" },
      }),
    ).toBe(
      "H9, red ship, 2 shields, can attack here, both ships would return to bays",
    );
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

  it("adds 'return position 1' right after 'bay', on an empty bay", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        returnCue: "return-position",
      }),
    ).toBe("D15, bay, return position 1");
  });

  it("adds 'next bay for a beaten ship' right after 'bay', on an empty bay", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        returnCue: "receptacle",
      }),
    ).toBe("D15, bay, next bay for a beaten ship");
  });

  it("names both return cues together, in that order, when position 1 is also the receptacle", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isBay: true,
        returnCue: "return-position-and-receptacle",
      }),
    ).toBe("H15, bay, return position 1, next bay for a beaten ship");
  });

  it("places a return cue before the occupant", () => {
    expect(
      squareLabel({
        square: squareAt("H", 15),
        isBay: true,
        returnCue: "return-position",
        occupant: { side: "green", shields: 0 },
      }),
    ).toBe("H15, bay, return position 1, green ship, 0 shields");
  });

  it("combines a return cue with a selection mark, the mark staying last", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
        returnCue: "receptacle",
        mark: "destination",
      }),
    ).toBe("D15, bay, next bay for a beaten ship, can move here");
  });

  it("says nothing about return cues when none is given", () => {
    expect(
      squareLabel({
        square: squareAt("D", 15),
        isBay: true,
      }),
    ).toBe("D15, bay");
  });
});
