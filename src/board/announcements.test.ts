import { describe, expect, it } from "vitest";
import { squareAt } from "../rules/board";
import type { GameState } from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type { GameResult } from "../rules/gameLength";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
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

  it("says no moves or attacks are available when neither a move nor a target exists", () => {
    const event: SelectedEvent = {
      type: "selected",
      shipId: "green-1",
      side: "green",
      square: squareAt("G", 7),
      destinationCount: 0,
      targetCount: 0,
    };
    expect(announcementFor(event)).toBe(
      "Green ship at G7 selected. No moves or attacks available.",
    );
  });

  it("announces a selection cleared", () => {
    const event: SelectionClearedEvent = { type: "selection-cleared" };
    expect(announcementFor(event)).toBe("Selection cleared.");
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
      cost: 1,
      powerAfter: 5,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The move cost 1 power, leaving 5. Red's turn.",
    );
  });

  it("announces a node spent by leaving it, between the move sentence and the turn-ending clause", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("G", 7),
      to: squareAt("H", 8),
      effects: [
        { type: "node-spent", square: squareAt("G", 7) },
        { type: "ply-ended", side: "green", sideToMove: "red", endOfTurn: [] },
      ],
      cost: 1,
      powerAfter: 5,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The move cost 1 power, leaving 5. The node at G7 ended when the ship left it. Red's turn.",
    );
  });

  it("announces a move that both ends on a planet and ends the ply", () => {
    const event: MovedEvent = {
      type: "moved",
      shipId: "red-2",
      side: "red",
      from: squareAt("C", 6),
      to: squareAt("D", 6),
      effects: [
        { type: "ply-ended", side: "red", sideToMove: "green", endOfTurn: [] },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Red ship moved from C6 onto the D6 planet. The move was free; it still has 6 power. Green's turn.",
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
          reason: "cannot-move-or-attack",
          endOfTurn: [],
        },
      ],
      cost: 1,
      powerAfter: 5,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The move cost 1 power, leaving 5. Red cannot move or attack, so the turn passes. Green's turn.",
    );
  });

  it("announces a passed ply", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
      endOfTurn: [],
    };
    expect(announcementFor(event)).toBe(
      "Red cannot move or attack, so the turn passes. Green's turn.",
    );
  });

  it("announces a passed ply that passed for want of time", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "out-of-time",
      endOfTurn: [],
    };
    expect(announcementFor(event)).toBe(
      "Red is out of time, so the turn passes. Green's turn.",
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
      "nothing-to-select",
      squareAt("G", 4),
      "No ship on G4. Choose one of your own ships.",
    ],
    [
      "ship-trapped",
      squareAt("G", 7),
      "That ship is trapped on a depleted node and cannot move until the node goes.",
    ],
    [
      "out-of-range",
      squareAt("J", 7),
      "J7 is out of range for the selected ship.",
    ],
    [
      "cannot-afford",
      squareAt("J", 9),
      "J9 costs more power than the selected ship has. A step up, down, left or right is free; a diagonal step costs 1; two squares or an L cost 2; three squares, two diagonally, or three and one across cost 3.",
    ],
    ["path-blocked", squareAt("C", 8), "An enemy ship is in the way of C8."],
    ["destination-occupied", squareAt("C", 7), "C7 is occupied."],
    [
      "destination-uncharged-node",
      squareAt("H", 8),
      "H8 holds a node that is not charged — a ship may fly over one, but cannot land on it.",
    ],
    [
      "attacker-on-planet",
      squareAt("H", 15),
      "A ship on a planet cannot attack. Move it off first.",
    ],
    [
      "attacker-on-charged-node",
      squareAt("H", 8),
      "A ship holding a charged node cannot attack while it stands there. Move it off first.",
    ],
    [
      "attacker-on-depleted-node",
      squareAt("H", 8),
      "A ship trapped on a depleted node cannot attack.",
    ],
    [
      "target-on-planet",
      squareAt("A", 6),
      "A ship on a planet cannot be attacked.",
    ],
    [
      "target-on-charged-node",
      squareAt("H", 8),
      "A ship holding a charged node cannot be attacked.",
    ],
    [
      "target-on-depleted-node",
      squareAt("H", 8),
      "A ship trapped on a depleted node cannot be attacked.",
    ],
    [
      "target-out-of-range",
      squareAt("J", 7),
      "J7 is not one of the shapes a ship can attack from here — up to three squares orthogonally, up to two diagonally, an L, or three and one across — whatever power it carries.",
    ],
    [
      "cannot-afford-target",
      squareAt("J", 9),
      "The selected ship does not have the power to strike J9. An orthogonal step is free, a diagonal costs 1, two squares or an L cost 2, and three squares, two diagonally, or three and one across cost 3.",
    ],
    [
      "attack-path-blocked",
      squareAt("J", 7),
      "An enemy ship stands in the way, so the attack cannot reach J7.",
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
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. The node at K5 ran out. Red's turn.",
    );
  });

  it("announces a node running out and trapping the ship on it, right after the node's own clause (§7, §8.1, §8.5)", () => {
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
            { type: "node-ran-out", square: squareAt("K", 5) },
            {
              type: "ship-trapped",
              shipId: "red-2",
              side: "red",
              square: squareAt("K", 5),
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "The node at K5 ran out. The red ship at K5 is trapped there until the node retires. " +
        "Red's turn.",
    );
  });

  it("announces a node retiring and freeing the ship on it, right after the retirement clause (§8.5, §8.6 step 6)", () => {
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
            { type: "node-retired", square: squareAt("D", 8) },
            {
              type: "ship-freed",
              shipId: "green-3",
              side: "green",
              square: squareAt("D", 8),
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "The node at D8 is gone. The green ship at D8 is free again. " +
        "Red's turn.",
    );
  });

  it("announces a node ended early to relieve an all-trapped side, ahead of the retirement it caused (§8.6 step 7, §5)", () => {
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
            { type: "node-relief", side: "red", square: squareAt("D", 8) },
            { type: "node-retired", square: squareAt("D", 8) },
            {
              type: "ship-freed",
              shipId: "red-2",
              side: "red",
              square: squareAt("D", 8),
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "Every red ship was trapped, so the node at D8 ended early. " +
        "The node at D8 is gone. The red ship at D8 is free again. " +
        "Red's turn.",
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
          endOfTurn: [{ type: "node-charged", square: squareAt("D", 8) }],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. A new node charged at D8. Red's turn.",
    );
  });

  it("announces a queue refill, naming the discarded squares, the new squares and the priority-3 node (§8.2, §8.6 step 5)", () => {
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
              type: "queue-refilled",
              discardedSquares: [squareAt("D", 8), squareAt("K", 11)],
              newNodes: [
                { square: squareAt("F", 3), priority: 1 },
                { square: squareAt("H", 12), priority: 3 },
                { square: squareAt("N", 4), priority: 2 },
              ],
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "The nodes waiting at D8 and K11 are gone. New nodes are waiting at F3, H12 and N4. H12 charges next. " +
        "Red's turn.",
    );
  });

  it("announces a queue refill with nothing discarded when all three of the previous queue charged", () => {
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
              type: "queue-refilled",
              discardedSquares: [],
              newNodes: [
                { square: squareAt("F", 3), priority: 2 },
                { square: squareAt("H", 12), priority: 1 },
                { square: squareAt("N", 4), priority: 3 },
              ],
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "Nothing was left waiting. New nodes are waiting at F3, H12 and N4. N4 charges next. " +
        "Red's turn.",
    );
  });

  it("announces a queue refill after a node charged, matching step 5 running after charging", () => {
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
            { type: "node-charged", square: squareAt("D", 8) },
            {
              type: "queue-refilled",
              discardedSquares: [squareAt("H", 12)],
              newNodes: [
                { square: squareAt("F", 3), priority: 3 },
                { square: squareAt("N", 4), priority: 1 },
              ],
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. " +
        "A new node charged at D8. " +
        "The nodes waiting at H12 are gone. New nodes are waiting at F3 and N4. F3 charges next. " +
        "Red's turn.",
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
              amount: 1,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at H8 gained a point of power, now on 3. Red's turn.",
    );
  });

  it("announces 2 points of power gained for a ship charging alone", () => {
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
              power: 4,
              amount: 2,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at A2 gained 2 points of power, now on 4. Red's turn.",
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
              amount: 1,
            },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 3,
              amount: 1,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ships at H8 and K5 each gained a point of power. Red's turn.",
    );
  });

  it("says which ship reached the maximum of 6, within a grouped clause", () => {
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
              amount: 1,
            },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 6,
              amount: 1,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ships at H8 and K5 each gained a point of power. K5 reached the maximum of 6. Red's turn.",
    );
  });

  it("says a single ship reached the maximum of 6 at the double rate", () => {
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
              power: 6,
              amount: 2,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at K5 gained 2 points of power, reaching the maximum of 6. Red's turn.",
    );
  });

  it("says a single ship reached the maximum of 6 with the double rate capped to what was left (rules.md §3.1)", () => {
    // A ship at 5 taking the double rate reaches 6 having gained only 1:
    // the announcement must never claim 2 points were gained when only 1
    // was.
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
              power: 6,
              amount: 1,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at K5 gained a point of power, reaching the maximum of 6. Red's turn.",
    );
  });

  it("puts the power-gained clause ahead of the rest of the sequence, whatever order the effects arrive in", () => {
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
            { type: "node-ran-out", square: squareAt("H", 8) },
            {
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("K", 5),
              power: 3,
              amount: 1,
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at K5 gained a point of power, now on 3. The node at H8 ran out. Red's turn.",
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
              type: "power-gained",
              shipId: "green-1",
              side: "green",
              square: squareAt("K", 5),
              power: 6,
              amount: 2,
            },
            { type: "node-ran-out", square: squareAt("K", 5) },
            { type: "node-retired", square: squareAt("N", 4) },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from K4 to K5. The move was free; it still has 6 power. " +
        "Green ship at K5 gained 2 points of power, reaching the maximum of 6. " +
        "The node at K5 ran out. " +
        "The node at N4 is gone. " +
        "Red's turn.",
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
          reason: "cannot-move-or-attack",
          endOfTurn: [],
        },
      ],
      cost: 1,
      powerAfter: 5,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from G7 to H8. The move cost 1 power, leaving 5. The node at K5 ran out. " +
        "Red cannot move or attack, so the turn passes. Green's turn.",
    );
  });

  it("carries a passing side's own end-of-turn clauses on a standalone pass", () => {
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
      endOfTurn: [
        {
          type: "power-gained",
          shipId: "red-1",
          side: "red",
          square: squareAt("K", 11),
          power: 2,
          amount: 1,
        },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Red cannot move or attack, so the turn passes. Red ship at K11 gained a point of power, now on 2. Green's turn.",
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
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green collected 1 energy from the node at H8, and now has 7. Red's turn.",
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
              amount: 3,
              newTotal: 21,
              squares: [squareAt("D", 8), squareAt("H", 8), squareAt("K", 11)],
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green collected 3 energy from 3 nodes at D8, H8 and K11, and now has 21. Red's turn.",
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
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Red's turn.",
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
              type: "power-gained",
              shipId: "green-2",
              side: "green",
              square: squareAt("H", 8),
              power: 2,
              amount: 1,
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
      cost: 0,
      powerAfter: 6,
    };
    expect(announcementFor(event)).toBe(
      "Green ship moved from C7 to C6. The move was free; it still has 6 power. Green ship at H8 gained a point of power, now on 2. Green collected 1 energy from the node at H8, and now has 5. The node at K5 ran out. Red's turn.",
    );
  });

  it("a passed turn still carries its own collection clause", () => {
    const collected: EnergyCollectedEffect = {
      type: "energy-collected",
      side: "red",
      amount: 2,
      newTotal: 2,
      squares: [squareAt("E", 5), squareAt("K", 5)],
    };
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "cannot-move-or-attack",
      endOfTurn: [collected],
    };
    expect(announcementFor(event)).toBe(
      "Red cannot move or attack, so the turn passes. Red collected 2 energy from 2 nodes at E5 and K5, and now has 2. Green's turn.",
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
    outOfTime?: { green: boolean; red: boolean };
  }): GameState {
    return {
      ships: [],
      nodes: {},
      sideToMove: config.sideToMove,
      plyNumber: config.plyNumber,
      randomSeed: 1,
      openingSeed: 1,
      energy: config.energy,
      lengthInRounds: config.lengthInRounds,
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
      outOfTime: config.outOfTime ?? { green: false, red: false },
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
      cost: 1,
      powerAfter: 5,
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
      cost: 1,
      powerAfter: 5,
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Red ship moved from G7 to H8. The move cost 1 power, leaving 5. The game is over after 3 rounds. Red wins, 7 energy to 4.",
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
      reason: "cannot-move-or-attack",
      endOfTurn: [],
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Red cannot move or attack, so the turn passes. The game is over after 3 rounds. The game is a draw, 4 energy each.",
    );
  });

  it("words the game-over clause for both players running out of time, ahead of the last round", () => {
    const state = stateAt({
      plyNumber: 5,
      sideToMove: "green",
      lengthInRounds: 30,
      energy: { green: 4, red: 4 },
      outOfTime: { green: true, red: true },
    });
    const event: PassEffect = {
      type: "ply-passed",
      side: "red",
      sideToMove: "green",
      reason: "out-of-time",
      endOfTurn: [],
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Red is out of time, so the turn passes. The game is over: both players are out of time. The game is a draw, 4 energy each.",
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
      cost: 0,
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
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };
    expect(announcementForSession(session)).toBe(
      "Green ship at H8 attacked the red ship at H9 and both were beaten. The attack was free; the attacker still has 2 power. The defender kept the power it was carrying. The attacker returned to the A1 planet and the defender to the A8 planet. The game is over after 3 rounds. Green wins, 9 energy to 2.",
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
      cost: 1,
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
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attack cost the attacker 1 power, leaving 2. The defender kept the power it was carrying. " +
        "The attacker returned to the A6 planet and the defender to the D1 planet. " +
        "Red's turn.",
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
      cost: 1,
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
          reason: "cannot-move-or-attack",
          endOfTurn: [],
        },
      ],
    };
    expect(announcementFor(event)).toBe(
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attack cost the attacker 1 power, leaving 2. The defender kept the power it was carrying. " +
        "The attacker returned to the A6 planet and the defender to the D1 planet. " +
        "Red cannot move or attack, so the turn passes. Green's turn.",
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
      cost: 0,
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
    };
    const sentence = announcementFor(event);
    expect(sentence).toBe(
      "Green ship at J4 attacked the red ship at K5 and both were beaten. " +
        "The attack was free; the attacker still has 0 power. The defender kept the power it was carrying. " +
        "The attacker returned to the A6 planet and the defender to the D1 planet. " +
        "Red's turn.",
    );
    expect(sentence).not.toMatch(/won|lost|advance|held its ground/);
  });
});

describe("turnIndicatorText", () => {
  it("states green as the side to play", () => {
    expect(
      turnIndicatorText({
        ships: [],
        nodes: {},
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      }),
    ).toBe("Green to play");
  });

  it("states red as the side to play", () => {
    expect(
      turnIndicatorText({
        ships: [],
        nodes: {},
        sideToMove: "red",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      }),
    ).toBe("Red to play");
  });

  it("reads 'Game over' once the game has ended, instead of naming a turn", () => {
    expect(
      turnIndicatorText({
        ships: [],
        nodes: {},
        sideToMove: "green",
        plyNumber: 7,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 4, red: 4 },
        lengthInRounds: 3,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
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
  }): GameState {
    const nodes: Record<string, { state: "charged"; level: number }> = {};
    for (const square of config.charged ?? []) {
      nodes[square] = { state: "charged", level: 1 };
    }
    return {
      ships: config.ships ?? [],
      nodes,
      sideToMove: "green",
      plyNumber: config.plyNumber,
      randomSeed: 1,
      openingSeed: 1,
      energy: config.energy,
      lengthInRounds: config.lengthInRounds,
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
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
        "Green: 0 energy, no nodes held.",
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
        "Green: 7 energy, 1 node held.",
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
        "Green: 24 energy, 2 nodes held.",
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
      expect(scoreSentence(state, "red")).toBe("Red: 1 energy, 1 node held.");
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
