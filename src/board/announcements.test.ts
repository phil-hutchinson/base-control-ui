import { describe, expect, it } from "vitest";
import { STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import { squareAt } from "../rules/board";
import { ACTIONS_PER_PLY } from "../rules/gameState";
import type {
  AttackedEvent,
  MovedEvent,
  RejectedEvent,
  RejectionReason,
  SelectedEvent,
  SelectionClearedEvent,
} from "../game/session";
import type { FightResolvedEffect, PassEffect } from "../rules/ply";
import { announcementFor, turnIndicatorText } from "./announcements";

describe("announcementFor", () => {
  it("counts destinations on selection, plural", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 20,
      targetCount: 0,
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
      targetCount: 0,
    };
    expect(announcementFor(event)).toBe(
      "Red ship at M10 selected. 1 move available.",
    );
  });

  it("counts targets on selection, plural, when there are no moves", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 0,
      targetCount: 2,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G7 selected. 2 targets available.",
    );
  });

  it("uses the singular at one target", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "red-1",
      side: "red",
      square: squareAt("M", 10),
      destinationCount: 0,
      targetCount: 1,
    };
    expect(announcementFor(event)).toBe(
      "Red ship at M10 selected. 1 target available.",
    );
  });

  it("counts both moves and targets when both are available", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 2,
      targetCount: 1,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G7 selected. 2 moves and 1 target available.",
    );
  });

  it("says no actions are available when neither a move nor a target exists", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 0,
      targetCount: 0,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G7 selected. No actions available.",
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
      actionsRemaining: 1,
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
      effects: [
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
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
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from A11 into the A10 bay and lost its shields. Red has 1 action left.",
    );
  });

  it("announces a move into a bay by a ship with no shields to lose as a plain move", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-2",
      side: "red",
      from: squareAt("A", 11),
      to: squareAt("A", 10),
      effects: [],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from A11 to A10. Red has 1 action left.",
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
        { type: "ply-ended", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
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
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
        { type: "ply-passed", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
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
      endOfTurn: [],
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
      "another-ship-stranded",
      squareAt("G", 7),
      "A stranded ship must be moved clear this turn. Only a move will free it — choose one of those.",
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
    [
      "attacker-in-bay",
      squareAt("H", 15),
      "A ship in a bay cannot attack. Move it out first.",
    ],
    ["target-in-bay", squareAt("A", 6), "A ship in a bay cannot be attacked."],
    [
      "target-not-adjacent",
      squareAt("J", 7),
      "J7 is out of attack range. An attack reaches only the eight squares around a ship.",
    ],
    [
      "target-is-friendly",
      squareAt("G", 7),
      "That is your own ship, not a target.",
    ],
    ["no-target-there", squareAt("G", 4), "There is no ship on G4 to attack."],
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

describe("announcementFor — the node cycle (rules.md §8)", () => {
  it("announces a move that lands on and charges a site", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [
        {
          type: "site-charged",
          square: squareAt("H", 8),
          shipId: "green-1",
          side: "green",
          reach: "landed-on",
        },
      ],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8 and charged the node. Green has 1 action left.",
    );
  });

  it("announces the opponent flying over and charging a site without stopping", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-2",
      side: "red",
      from: squareAt("K", 9),
      to: squareAt("K", 12),
      effects: [
        {
          type: "site-charged",
          square: squareAt("K", 11),
          shipId: "red-2",
          side: "red",
          reach: "flown-over",
        },
      ],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from K9 to K12, flying over K11 and charging the node. Red has 1 action left.",
    );
  });

  it("announces a node running out at the end of a turn", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [{ type: "node-ran-out", square: squareAt("K", 5) }],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The node at K5 ran out. Red's turn, 2 actions left.",
    );
  });

  it("announces a replacement waking active", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "site-woken",
              square: squareAt("D", 8),
              wokeInto: "active",
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. A new node woke at D8. Red's turn, 2 actions left.",
    );
  });

  it("announces a replacement waking already charged, under a ship", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "site-woken",
              square: squareAt("D", 8),
              wokeInto: "charged",
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. A new node woke at D8, already charged because a ship was standing there. Red's turn, 2 actions left.",
    );
  });

  it("announces a ship becoming stranded, naming the square", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "ship-stranded",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at K5 is stranded and must be moved clear next turn. Red's turn, 2 actions left.",
    );
  });

  it("announces one shield gained, naming the square and the new count", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "shield-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("H", 8),
              shields: 2,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at H8 gained a shield, now on 2. Red's turn, 2 actions left.",
    );
  });

  it("groups several shields gained in one sequence into one clause", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "shield-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              shields: 2,
            },
            {
              type: "shield-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              shields: 3,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each gained a shield. Red's turn, 2 actions left.",
    );
  });

  it("says which ship reached the shield cap of 4, within a grouped clause", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "shield-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              shields: 2,
            },
            {
              type: "shield-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              shields: 4,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each gained a shield. K5 reached the cap of 4. Red's turn, 2 actions left.",
    );
  });

  it("says a single ship reached the shield cap of 4", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "shield-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              shields: 4,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at K5 gained a shield, reaching the cap of 4. Red's turn, 2 actions left.",
    );
  });

  it("says nothing at all for a site cooling back to dormant", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [{ type: "site-cooled", square: squareAt("N", 4) }],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Red's turn, 2 actions left.",
    );
  });

  it("announces a full end-of-turn sequence in the order it was produced", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("K", 4),
      to: squareAt("K", 5),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "shield-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              shields: 4,
            },
            { type: "site-cooled", square: squareAt("N", 4) },
            { type: "node-ran-out", square: squareAt("K", 5) },
            {
              type: "ship-stranded",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
            },
            {
              type: "site-woken",
              square: squareAt("D", 8),
              wokeInto: "active",
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from K4 to K5. " +
        "Green ship at K5 gained a shield, reaching the cap of 4. " +
        "The node at K5 ran out. " +
        "Green ship at K5 is stranded and must be moved clear next turn. " +
        "A new node woke at D8. " +
        "Red's turn, 2 actions left.",
    );
  });

  it("carries the end-of-turn clauses of the ended ply ahead of a following pass", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [{ type: "node-ran-out", square: squareAt("K", 5) }],
        },
        { type: "ply-passed", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The node at K5 ran out. " +
        "Red has no legal move, so the turn passes. Green's turn, 2 actions left.",
    );
  });

  it("carries a passing side's own end-of-turn clauses on a standalone pass", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      endOfTurn: [
        {
          type: "shield-gained",
          shipId: "red-1",
          side: "red",
          square: squareAt("K", 11),
          shields: 2,
        },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal move, so the turn passes. Red ship at K11 gained a shield, now on 2. Green's turn, 2 actions left.",
    );
  });
});

describe("announcementFor — combat (rules.md \u00a77)", () => {
  it("announces the attacker winning: outcome, bay and shield cost", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      outcome: "attacker-won",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        shields: 4,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        shields: 0,
      },
      winner: { shipId: "green-1", remainingShields: 3 },
      returns: [
        {
          shipId: "red-1",
          side: "red",
          from: squareAt("K", 5),
          to: squareAt("D", 1),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("J", 4),
      target: squareAt("K", 5),
      effects: [fight],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and won. " +
        "The beaten ship returned to the D1 bay with no shields. " +
        "The fight cost 1 shield, leaving the winner on 3. " +
        "Green has 1 action left.",
    );
  });

  it("announces the defender winning, read as a real choice rather than an error", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      outcome: "defender-won",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("G", 9),
        shields: 1,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("H", 9),
        shields: 3,
      },
      winner: { shipId: "red-1", remainingShields: 1 },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("G", 9),
          to: squareAt("D", 1),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 9),
      target: squareAt("H", 9),
      effects: [fight],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G9 attacked the red ship at H9 and lost. " +
        "The beaten ship returned to the D1 bay with no shields. " +
        "The fight cost the defender 2 shields, leaving it on 1. " +
        "Green has 1 action left.",
    );
  });

  it("announces a mutual return, naming both bays", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      outcome: "mutual-return",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("C", 6),
        shields: 2,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("C", 7),
        shields: 2,
      },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("C", 6),
          to: squareAt("D", 1),
        },
        {
          shipId: "red-1",
          side: "red",
          from: squareAt("C", 7),
          to: squareAt("A", 2),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("C", 6),
      target: squareAt("C", 7),
      effects: [fight],
      actionsRemaining: 1,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at C6 attacked the red ship at C7 and both were beaten. " +
        "The attacker returned to the D1 bay and the defender to the A2 bay, both with no shields. " +
        "Green has 1 action left.",
    );
  });

  it("carries the same ending clause a move uses when an attack ends the ply", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      outcome: "attacker-won",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        shields: 1,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        shields: 0,
      },
      winner: { shipId: "green-1", remainingShields: 0 },
      returns: [
        {
          shipId: "red-1",
          side: "red",
          from: squareAt("K", 5),
          to: squareAt("D", 1),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("J", 4),
      target: squareAt("K", 5),
      effects: [
        fight,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and won. " +
        "The beaten ship returned to the D1 bay with no shields. " +
        "The fight cost 1 shield, leaving the winner on 0. " +
        "Red's turn, 2 actions left.",
    );
  });

  it("carries a following pass when the fight leaves the other side with nothing to do", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      outcome: "attacker-won",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        shields: 1,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        shields: 0,
      },
      winner: { shipId: "green-1", remainingShields: 0 },
      returns: [
        {
          shipId: "red-1",
          side: "red",
          from: squareAt("K", 5),
          to: squareAt("D", 1),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("J", 4),
      target: squareAt("K", 5),
      effects: [
        fight,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
        { type: "ply-passed", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and won. " +
        "The beaten ship returned to the D1 bay with no shields. " +
        "The fight cost 1 shield, leaving the winner on 0. " +
        "Red has no legal move, so the turn passes. Green's turn, 2 actions left.",
    );
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
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
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
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
      }),
    ).toBe("Red's turn — 1 action left");
  });
});
