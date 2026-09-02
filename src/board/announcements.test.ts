import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import { ACTIONS_PER_PLY, type GameState } from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type { GameResult } from "../rules/gameLength";
import type { EnergyCollectedEffect } from "../rules/endOfTurn";
import type {
  AttackedEvent,
  MovedEvent,
  RejectedEvent,
  RejectionReason,
  SelectedEvent,
  SelectionClearedEvent,
  Session,
} from "../game/session";
import type { FightResolvedEffect, PassEffect } from "../rules/ply";
import {
  GAME_OVER_HEADING,
  announcementFor,
  announcementForSession,
  resultSentence,
  roundCounterSpokenText,
  roundCounterText,
  scoreSentence,
  turnIndicatorText,
} from "./announcements";

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
      "Green ship moved from G7 to H8. Red's turn, 1 action left.",
    );
  });

  it("announces a move that ends in a bay", () => {
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
      "Red ship moved from A11 into the A10 bay. Red has 1 action left.",
    );
  });

  it("announces a move into a bay the same way whatever power the ship arrives with", () => {
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
      "Red ship moved from A11 into the A10 bay. Red has 1 action left.",
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
        { type: "ply-ended", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from A11 into the A10 bay. Green's turn, 1 action left.",
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
        {
          type: "ply-passed",
          side: "red",
          sideToMove: "green",
          reason: "no-legal-action",
          endOfTurn: [],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. Red has no legal action, so the turn passes. Green's turn, 1 action left.",
    );
  });

  it("announces a passed ply", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
      endOfTurn: [],
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal action, so the turn passes. Green's turn, 1 action left.",
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
      "ship-already-acted",
      squareAt("G", 7),
      "That ship has already acted this turn. Choose another.",
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
      "attacker-in-bay",
      squareAt("H", 15),
      "A ship in a bay cannot attack. Move it out first.",
    ],
    [
      "attacker-on-charged-node",
      squareAt("H", 8),
      "A ship holding a charged node cannot attack while it stands there. Move it off first.",
    ],
    ["target-in-bay", squareAt("A", 6), "A ship in a bay cannot be attacked."],
    [
      "target-on-charged-node",
      squareAt("H", 8),
      "A ship holding a charged node cannot be attacked.",
    ],
    [
      "target-out-of-range",
      squareAt("J", 7),
      "J7 is out of attack range. A ship attacks as far as it moves, so a drained ship barely strikes at all — a ship at 0 power can only strike one square up, down, left or right.",
    ],
    [
      "attack-path-blocked",
      squareAt("J", 7),
      "Another ship stands in the way, so the attack cannot reach J7.",
    ],
    [
      "target-is-friendly",
      squareAt("G", 7),
      "That is your own ship, not a target.",
    ],
    ["no-target-there", squareAt("G", 4), "There is no ship on G4 to attack."],
    [
      "game-over",
      squareAt("G", 4),
      "The game is over. Nothing further can be played.",
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

describe("announcementFor — the node cycle (rules.md §8)", () => {
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
      "Green ship moved from C7 to C6. The node at K5 ran out. Red's turn, 1 action left.",
    );
  });

  it("announces a new node charging at the end of a turn (§8.2)", () => {
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
          endOfTurn: [{ type: "site-charged", square: squareAt("D", 8) }],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. A new node charged at D8. Red's turn, 1 action left.",
    );
  });

  it("says nothing at all for a dormant site going active (§8.2, §8.6)", () => {
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
          endOfTurn: [{ type: "site-went-active", square: squareAt("D", 8) }],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Red's turn, 1 action left.",
    );
  });

  it("announces one point of power lost, naming the square and the new count", () => {
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
              type: "power-lost",
              shipId: "green-2",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at H8 lost a point of power, now on 2. Red's turn, 1 action left.",
    );
  });

  it("groups several points of power lost in one sequence into one clause", () => {
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
              type: "power-lost",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
            {
              type: "power-lost",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 1,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each lost a point of power. Red's turn, 1 action left.",
    );
  });

  it("says which ship reached 0, within a grouped clause", () => {
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
              type: "power-lost",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
            {
              type: "power-lost",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 0,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each lost a point of power. K5 reached 0. Red's turn, 1 action left.",
    );
  });

  it("says a single ship reached 0", () => {
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
              type: "power-lost",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              power: 0,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at K5 lost a point of power, reaching 0. Red's turn, 1 action left.",
    );
  });

  it("announces one point of power gained, naming the square and the new count", () => {
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
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("H", 8),
              power: 3,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at H8 gained a point of power, now on 3. Red's turn, 1 action left.",
    );
  });

  it("announces a point of power gained in a bay the same way as on a dormant site", () => {
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
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("A", 2),
              power: 3,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at A2 gained a point of power, now on 3. Red's turn, 1 action left.",
    );
  });

  it("groups several points of power gained in one sequence into one clause", () => {
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
              type: "power-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 3,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each gained a point of power. Red's turn, 1 action left.",
    );
  });

  it("says which ship reached the maximum of 4, within a grouped clause", () => {
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
              type: "power-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              power: 3,
            },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 4,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ships at H8 and K5 each gained a point of power. K5 reached the maximum of 4. Red's turn, 1 action left.",
    );
  });

  it("says a single ship reached the maximum of 4", () => {
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
              type: "power-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              power: 4,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at K5 gained a point of power, reaching the maximum of 4. Red's turn, 1 action left.",
    );
  });

  it("reads losses before gains when a sequence has both", () => {
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
              type: "power-lost",
              shipId: "green-1",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 3,
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at H8 lost a point of power, now on 2. Green ship at K5 gained a point of power, now on 3. Red's turn, 1 action left.",
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
              type: "power-lost",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              power: 0,
            },
            { type: "node-ran-out", square: squareAt("K", 5) },
            { type: "site-went-active", square: squareAt("N", 4) },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from K4 to K5. " +
        "Green ship at K5 lost a point of power, reaching 0. " +
        "The node at K5 ran out. " +
        "Red's turn, 1 action left.",
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
        {
          type: "ply-passed",
          side: "red",
          sideToMove: "green",
          reason: "no-legal-action",
          endOfTurn: [],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The node at K5 ran out. " +
        "Red has no legal action, so the turn passes. Green's turn, 1 action left.",
    );
  });

  it("carries a passing side's own end-of-turn clauses on a standalone pass", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
      endOfTurn: [
        {
          type: "power-lost",
          shipId: "red-1",
          side: "red",
          square: squareAt("K", 11),
          power: 2,
        },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal action, so the turn passes. Red ship at K11 lost a point of power, now on 2. Green's turn, 1 action left.",
    );
  });
});

describe("announcementFor — energy collected (rules.md \u00a78.4)", () => {
  it("announces one node held", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
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
              type: "energy-collected",
              side: "green",
              amount: 1,
              newTotal: 7,
              squares: [squareAt("H", 8)],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green collected 1 energy from the node at H8, and now has 7. Red's turn, 1 action left.",
    );
  });

  it("announces several nodes held, naming the count and every square", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
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
              type: "energy-collected",
              side: "green",
              amount: 6,
              newTotal: 24,
              squares: [squareAt("D", 8), squareAt("H", 8), squareAt("K", 11)],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green collected 6 energy from 3 nodes at D8, H8 and K11, and now has 24. Red's turn, 1 action left.",
    );
  });

  it("produces no clause when nothing was collected", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Red's turn, 1 action left.",
    );
  });

  it("orders the collection after the power clause and before a node running out", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
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
              type: "power-lost",
              shipId: "green-2",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
            },
            {
              type: "energy-collected",
              side: "green",
              amount: 1,
              newTotal: 5,
              squares: [squareAt("H", 8)],
            },
            { type: "node-ran-out", square: squareAt("K", 5) },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green ship at H8 lost a point of power, now on 2. Green collected 1 energy from the node at H8, and now has 5. The node at K5 ran out. Red's turn, 1 action left.",
    );
  });

  it("a passed turn still carries its own collection clause", () => {
    const collected: EnergyCollectedEffect = {
      type: "energy-collected",
      side: "red",
      amount: 3,
      newTotal: 3,
      squares: [squareAt("E", 5), squareAt("K", 5)],
    };
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
      endOfTurn: [collected],
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal action, so the turn passes. Red collected 3 energy from 2 nodes at E5 and K5, and now has 3. Green's turn, 1 action left.",
    );
  });
});

describe("announcementFor — energy penalty (rules.md §8.4)", () => {
  it("announces one dormant site occupied", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-2",
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
              type: "energy-penalty",
              side: "green",
              amount: 1,
              newTotal: 4,
              squares: [squareAt("H", 8)],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green lost 1 energy to the dormant site at H8, and now has 4. Red's turn, 1 action left.",
    );
  });

  it("announces several dormant sites occupied, naming the count and every square", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-2",
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
              type: "energy-penalty",
              side: "green",
              amount: 3,
              newTotal: 0,
              squares: [squareAt("D", 8), squareAt("H", 8), squareAt("K", 11)],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green lost 3 energy to 3 dormant sites at D8, H8 and K11, and now has 0. Red's turn, 1 action left.",
    );
  });

  it("names every dormant site occupied and says five are penalised once the cap is passed", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-2",
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
              type: "energy-penalty",
              side: "green",
              amount: 15,
              newTotal: 0,
              squares: [
                squareAt("D", 8),
                squareAt("H", 8),
                squareAt("K", 11),
                squareAt("E", 5),
                squareAt("K", 5),
                squareAt("G", 6),
              ],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green lost 15 energy to 6 dormant sites at D8, H8, K11, E5, K5 and G6, five of which are penalised, and now has 0. Red's turn, 1 action left.",
    );
  });

  it("produces no clause when nothing was paid", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-3",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Red's turn, 1 action left.",
    );
  });

  it("reads a turn that both collects and pays as two sentences, collection first", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-2",
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
              type: "energy-collected",
              side: "green",
              amount: 6,
              newTotal: 6,
              squares: [squareAt("D", 8), squareAt("H", 8), squareAt("K", 11)],
            },
            {
              type: "energy-penalty",
              side: "green",
              amount: 3,
              newTotal: 3,
              squares: [squareAt("E", 5), squareAt("K", 5)],
            },
          ],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. Green collected 6 energy from 3 nodes at D8, H8 and K11, and now has 6. Green lost 3 energy to 2 dormant sites at E5 and K5, and now has 3. Red's turn, 1 action left.",
    );
  });

  it("a passed turn still carries its own penalty clause", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
      endOfTurn: [
        {
          type: "energy-penalty",
          side: "red",
          amount: 3,
          newTotal: 0,
          squares: [squareAt("E", 5), squareAt("K", 5)],
        },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Red has no legal action, so the turn passes. Red lost 3 energy to 2 dormant sites at E5 and K5, and now has 0. Green's turn, 1 action left.",
    );
  });
});

describe("resultSentence", () => {
  it("names green as the winner, with both totals", () => {
    const result: GameResult = {
      outcome: "green-won",
      winner: "green",
      energy: { green: 42, red: 37 },
    };
    expect(resultSentence(result)).toBe("Green wins, 42 energy to 37.");
  });

  it("names red as the winner, with both totals", () => {
    const result: GameResult = {
      outcome: "red-won",
      winner: "red",
      energy: { green: 20, red: 31 },
    };
    expect(resultSentence(result)).toBe("Red wins, 31 energy to 20.");
  });

  it("names a draw, with the shared total", () => {
    const result: GameResult = {
      outcome: "draw",
      energy: { green: 37, red: 37 },
    };
    expect(resultSentence(result)).toBe("The game is a draw, 37 energy each.");
  });
});

describe("announcementForSession", () => {
  function stateAt(config: {
    plyNumber: number;
    sideToMove: "green" | "red";
    lengthInRounds: number;
    energy: { green: number; red: number };
  }): GameState {
    return {
      ships: [],
      siteStates: {},
      sideToMove: config.sideToMove,
      actionsRemaining: ACTIONS_PER_PLY,
      actedThisPly: [],
      plyNumber: config.plyNumber,
      randomSeed: 1,
      energy: config.energy,
      lengthInRounds: config.lengthInRounds,
      outOfTime: { green: false, red: false },
    };
  }

  it("is unchanged before the game is over", () => {
    const state = stateAt({
      plyNumber: 5,
      sideToMove: "red",
      lengthInRounds: 3,
      energy: { green: 4, red: 1 },
    });
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
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(announcementFor(event));
  });

  it("substitutes the result for the next-turn clause when a move ends the game", () => {
    const state = stateAt({
      plyNumber: 7,
      sideToMove: "green",
      lengthInRounds: 3,
      energy: { green: 4, red: 7 },
    });
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-1",
      side: "red",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [
        {
          type: "ply-ended",
          side: "red",
          sideToMove: "green",
          endOfTurn: [],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Red ship moved from G7 to H8. The game is over after 3 rounds. Red wins, 7 energy to 4.",
    );
  });

  it("substitutes the result for the next-turn clause when a pass ends the game", () => {
    const state = stateAt({
      plyNumber: 7,
      sideToMove: "green",
      lengthInRounds: 3,
      energy: { green: 4, red: 4 },
    });
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "no-legal-action",
      endOfTurn: [],
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Red has no legal action, so the turn passes. The game is over after 3 rounds. The game is a draw, 4 energy each.",
    );
  });

  it("substitutes the result for the next-turn clause when an attack ends the game", () => {
    const state = stateAt({
      plyNumber: 7,
      sideToMove: "green",
      lengthInRounds: 3,
      energy: { green: 9, red: 2 },
    });
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("H", 8),
        power: 2,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("H", 9),
        power: 3,
      },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("H", 8),
          to: squareAt("A", 1),
        },
        {
          shipId: "red-1",
          side: "red",
          from: squareAt("H", 9),
          to: squareAt("A", 8),
        },
      ],
    };
    const event: AttackedEvent = {
      type: "attacked",
      shipId: "green-1",
      side: "green",
      from: squareAt("H", 8),
      target: squareAt("H", 9),
      effects: [
        fight,
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Green ship at H8 attacked the red ship at H9 and both were beaten. The attacker returned to the A1 bay and the defender to the A8 bay, both keeping the power they were carrying. The game is over after 3 rounds. Green wins, 9 energy to 2.",
    );
  });

  it("leaves a rejection's own game-over sentence untouched", () => {
    const state = stateAt({
      plyNumber: 7,
      sideToMove: "green",
      lengthInRounds: 3,
      energy: { green: 4, red: 4 },
    });
    const event: RejectedEvent = {
      type: "rejected",
      reason: "game-over",
      square: squareAt("H", 8),
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "The game is over. Nothing further can be played.",
    );
  });

  it("is empty when there is no event yet, even at game over", () => {
    const state = stateAt({
      plyNumber: 7,
      sideToMove: "green",
      lengthInRounds: 3,
      energy: { green: 0, red: 0 },
    });
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: undefined,
    };
    expect(announcementForSession(session)).toBe("");
  });
});

describe("announcementFor — combat (rules.md §7)", () => {
  it("announces a fight, naming both ships and both bays", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("C", 6),
        power: 2,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("C", 7),
        power: 2,
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
        "The attacker returned to the D1 bay and the defender to the A2 bay, both keeping the power they were carrying. " +
        "Green has 1 action left.",
    );
  });

  it("announces a fight whatever power either ship carried, never naming a winner", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        power: 0,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        power: 4,
      },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("J", 4),
          to: squareAt("A", 6),
        },
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
    const sentence = announcementFor(event);
    expect(sentence).toBe(
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attacker returned to the A6 bay and the defender to the D1 bay, both keeping the power they were carrying. " +
        "Green has 1 action left.",
    );
    expect(sentence).not.toMatch(/won|lost|advance|held its ground/);
  });

  it("carries the same ending clause a move uses when an attack ends the ply", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        power: 3,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        power: 4,
      },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("J", 4),
          to: squareAt("A", 6),
        },
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
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attacker returned to the A6 bay and the defender to the D1 bay, both keeping the power they were carrying. " +
        "Red's turn, 1 action left.",
    );
  });

  it("carries a following pass when the fight leaves the other side with nothing to do", () => {
    const fight: FightResolvedEffect = {
      type: "fight-resolved",
      attacker: {
        shipId: "green-1",
        side: "green",
        square: squareAt("J", 4),
        power: 3,
      },
      defender: {
        shipId: "red-1",
        side: "red",
        square: squareAt("K", 5),
        power: 4,
      },
      returns: [
        {
          shipId: "green-1",
          side: "green",
          from: squareAt("J", 4),
          to: squareAt("A", 6),
        },
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
        {
          type: "ply-passed",
          side: "red",
          sideToMove: "green",
          reason: "no-legal-action",
          endOfTurn: [],
        },
      ],
      actionsRemaining: ACTIONS_PER_PLY,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attacker returned to the A6 bay and the defender to the D1 bay, both keeping the power they were carrying. " +
        "Red has no legal action, so the turn passes. Green's turn, 1 action left.",
    );
  });
});

describe("turnIndicatorText", () => {
  it("states green as the side to play", () => {
    expect(
      turnIndicatorText({
        ships: [],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: ACTIONS_PER_PLY,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        outOfTime: { green: false, red: false },
      }),
    ).toBe("Green to play");
  });

  it("states red as the side to play", () => {
    expect(
      turnIndicatorText({
        ships: [],
        siteStates: {},
        sideToMove: "red",
        actionsRemaining: ACTIONS_PER_PLY,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        outOfTime: { green: false, red: false },
      }),
    ).toBe("Red to play");
  });

  it("reads 'Game over' once the game has ended, instead of naming a turn", () => {
    expect(
      turnIndicatorText({
        ships: [],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: ACTIONS_PER_PLY,
        actedThisPly: [],
        plyNumber: 7,
        randomSeed: 1,
        energy: { green: 4, red: 4 },
        lengthInRounds: 3,
        outOfTime: { green: false, red: false },
      }),
    ).toBe("Game over");
  });
});

describe("HUD wording", () => {
  function stateWith(config: {
    energy: { green: number; red: number };
    lengthInRounds: number;
    plyNumber: number;
    ships?: readonly {
      id: string;
      side: "green" | "red";
      square: ReturnType<typeof squareAt>;
      power: 0 | 1 | 2 | 3 | 4;
    }[];
    charged?: readonly string[];
    dormant?: readonly string[];
  }): GameState {
    const siteStates: Record<
      string,
      { state: "charged" | "dormant"; level: number }
    > = {};
    for (const square of config.charged ?? []) {
      siteStates[square] = { state: "charged", level: 1 };
    }
    for (const square of config.dormant ?? []) {
      siteStates[square] = { state: "dormant", level: 1 };
    }
    return {
      ships: config.ships ?? [],
      siteStates,
      sideToMove: "green",
      actionsRemaining: ACTIONS_PER_PLY,
      actedThisPly: [],
      plyNumber: config.plyNumber,
      randomSeed: 1,
      energy: config.energy,
      lengthInRounds: config.lengthInRounds,
      outOfTime: { green: false, red: false },
    };
  }

  describe("scoreSentence", () => {
    it("names no nodes held at zero", () => {
      const state = stateWith({
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 1,
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 0 energy, no nodes held, standing on no dormant sites.",
      );
    });

    it("uses the singular at one node held", () => {
      const state = stateWith({
        energy: { green: 7, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 3,
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 4,
          },
        ],
        charged: ["H8"],
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 7 energy, 1 node held, standing on no dormant sites.",
      );
    });

    it("counts several nodes held, plural", () => {
      const state = stateWith({
        energy: { green: 24, red: 3 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 3,
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 4,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("E", 5),
            power: 4,
          },
        ],
        charged: ["H8", "E5"],
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 24 energy, 2 nodes held, standing on no dormant sites.",
      );
    });

    it("reads the other side's own total and count, unaffected by a node it does not hold", () => {
      const state = stateWith({
        energy: { green: 7, red: 1 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 4,
        ships: [
          { id: "red-1", side: "red", square: squareAt("K", 5), power: 4 },
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 4,
          },
        ],
        charged: ["K5", "H8"],
      });
      expect(scoreSentence(state, "red")).toBe(
        "Red: 1 energy, 1 node held, standing on no dormant sites.",
      );
    });

    it("uses the singular at one dormant site occupied", () => {
      const state = stateWith({
        energy: { green: 4, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 5,
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 4,
          },
        ],
        dormant: ["H8"],
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 4 energy, no nodes held, standing on 1 dormant site.",
      );
    });

    it("counts several dormant sites occupied, plural", () => {
      const state = stateWith({
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 5,
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 4,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("E", 5),
            power: 4,
          },
        ],
        dormant: ["H8", "E5"],
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 0 energy, no nodes held, standing on 2 dormant sites.",
      );
    });

    it("does not count the opponent's ships on dormant sites", () => {
      const state = stateWith({
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 5,
        ships: [
          { id: "red-1", side: "red", square: squareAt("H", 8), power: 4 },
        ],
        dormant: ["H8"],
      });
      expect(scoreSentence(state, "green")).toBe(
        "Green: 0 energy, no nodes held, standing on no dormant sites.",
      );
    });
  });

  describe("roundCounterText and roundCounterSpokenText", () => {
    it("reads the round out of a default-length game's own length", () => {
      const state = stateWith({
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        plyNumber: 39,
      });
      expect(roundCounterText(state)).toBe("20/30");
      expect(roundCounterSpokenText(state)).toBe("Round 20 of 30.");
    });

    it("holds at the game's own length once the game is over, never naming the default length", () => {
      const state = stateWith({
        energy: { green: 0, red: 0 },
        lengthInRounds: 3,
        plyNumber: 7,
      });
      expect(roundCounterText(state)).toBe("3/3");
      expect(roundCounterSpokenText(state)).toBe("Round 3 of 3.");
    });
  });

  it("names the result panel's heading in sentence case", () => {
    expect(GAME_OVER_HEADING).toBe("Game over");
  });
});
