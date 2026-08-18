import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { ACTIONS_PER_PLY } from "../rules/gameState";
import type {
  MovedEvent,
  RejectedEvent,
  RejectionReason,
  SelectedEvent,
  SelectionClearedEvent,
} from "../game/session";
import type { PassEffect } from "../rules/ply";
import { announcementFor, turnIndicatorText } from "./announcements";

describe("announcementFor", () => {
  it("counts destinations on selection, plural", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 20,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G7 selected. 20 moves available.",
    );
  });

  it("uses the singular at one destination", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "red-1",
      side: "red",
      square: squareAt("M", 10),
      destinationCount: 1,
    };
    expect(announcementFor(event)).toBe(
      "Red ship at M10 selected. 1 move available.",
    );
  });

  it("announces a selection cleared", () => {
    const event: SelectionClearedEvent = { type: "selection-cleared" };
    expect(announcementFor(event)).toBe("Selection cleared.");
  });

  it("announces a move mid-ply", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [],
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. Green has 1 action left.",
    );
  });

  it("announces a move that ends the ply", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [{ type: "ply-ended", sideToMove: "red" }],
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. Red's turn, 2 actions left.",
    );
  });

  it("announces a move that ends in a bay", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-2",
      side: "red",
      from: squareAt("A", 11),
      to: squareAt("A", 10),
      effects: [{ type: "shields-reset", shipId: "red-2" }],
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from A11 into the A10 bay and lost its shields. Red has 1 action left.",
    );
  });

  it("announces a move that both ends in a bay and ends the ply", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-2",
      side: "red",
      from: squareAt("A", 11),
      to: squareAt("A", 10),
      effects: [
        { type: "shields-reset", shipId: "red-2" },
        { type: "ply-ended", sideToMove: "green" },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from A11 into the A10 bay and lost its shields. Green's turn, 2 actions left.",
    );
  });

  it("announces a move immediately followed by a pass", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [
        { type: "ply-ended", sideToMove: "red" },
        { type: "ply-passed", side: "red", sideToMove: "green" },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. Red has no legal move, so the turn passes. Green's turn, 2 actions left.",
    );
  });

  it("announces a passed ply", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal move, so the turn passes. Green's turn, 2 actions left.",
    );
  });

  const cases: ReadonlyArray<
    readonly [RejectionReason, ReturnType<typeof squareAt>, string]
  > = [
    [
      "not-your-ship",
      squareAt("G", 7),
      "That is your opponent's ship. Choose one of your own.",
    ],
    [
      "ship-already-moved",
      squareAt("G", 7),
      "That ship has already moved this turn. Choose another.",
    ],
    [
      "nothing-to-select",
      squareAt("G", 4),
      "No ship on G4. Choose one of your own ships.",
    ],
    [
      "out-of-range",
      squareAt("J", 7),
      "J7 is out of range for the selected ship.",
    ],
    ["path-blocked", squareAt("C", 8), "Another ship is in the way of C8."],
    ["destination-occupied", squareAt("C", 7), "C7 is occupied."],
    [
      "destination-dormant-site",
      squareAt("D", 8),
      "D8 is a dormant site — a ship cannot stop there.",
    ],
    [
      "destination-depleted-site",
      squareAt("H", 4),
      "H4 is a depleted site — a ship cannot stop there.",
    ],
  ];

  it.each(cases)(
    "gives a plain-language reason for %s",
    (reason, square, sentence) => {
      const event: RejectedEvent = { type: "rejected", reason, square };
      expect(announcementFor(event)).toBe(sentence);
    },
  );

  it("is empty when there is no event yet", () => {
    expect(announcementFor(undefined)).toBe("");
  });
});

describe("turnIndicatorText", () => {
  it("states the side to move and its actions, plural", () => {
    expect(
      turnIndicatorText({
        ships: [],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: ACTIONS_PER_PLY,
        movedThisPly: [],
      }),
    ).toBe("Green's turn — 2 actions left");
  });

  it("uses the singular at one action left", () => {
    expect(
      turnIndicatorText({
        ships: [],
        siteStates: {},
        sideToMove: "red",
        actionsRemaining: 1,
        movedThisPly: [],
      }),
    ).toBe("Red's turn — 1 action left");
  });
});
