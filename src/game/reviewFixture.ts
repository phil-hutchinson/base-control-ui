// A temporary hand-testing position for the manual verification gates in
// this story. It is not a legal game state: a real game never starts with a
// charged or depleted site, and every shielded ship here stands on the
// board's interior rather than in a bay (rules.md §3.1 strips a ship's
// shields the moment it ends a move in a bay). It exists only so the manual
// gates have every §6 range, both site restrictions, and both kinds of
// blocking one move away, and it is deleted once those gates are done with
// it.

import { type ColumnLetter, squareAt } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { GameState, Ship } from "../rules/gameState";
import { ACTIONS_PER_PLY } from "../rules/gameState";
import type { SiteState } from "../rules/sites";
import type { ShieldCount } from "../rules/shields";

interface ShipSpec {
  readonly id: string;
  readonly side: Side;
  readonly column: ColumnLetter;
  readonly row: number;
  readonly shields: ShieldCount;
}

const SHIP_SPECS: readonly ShipSpec[] = [
  // Green's five-shield ladder: one ship at each shield count, each with a
  // clear reach, so all five §6 ranges are visible without playing a move.
  { id: "green-1", side: "green", column: "G", row: 7, shields: 0 },
  { id: "green-2", side: "green", column: "I", row: 6, shields: 1 },
  { id: "green-3", side: "green", column: "I", row: 10, shields: 2 },
  { id: "green-4", side: "green", column: "M", row: 6, shields: 3 },
  { id: "green-5", side: "green", column: "M", row: 10, shields: 4 },
  // Green's blocking demonstration.
  { id: "green-6", side: "green", column: "C", row: 5, shields: 0 },
  { id: "green-7", side: "green", column: "C", row: 7, shields: 0 },
  // Red's blocker for green's demonstration.
  { id: "red-1", side: "red", column: "C", row: 3, shields: 0 },
  // Red's own site and bay cases.
  { id: "red-2", side: "red", column: "H", row: 3, shields: 0 },
  { id: "red-3", side: "red", column: "A", row: 11, shields: 2 },
  { id: "red-4", side: "red", column: "B", row: 13, shields: 0 },
  { id: "red-5", side: "red", column: "G", row: 13, shields: 4 },
  { id: "red-6", side: "red", column: "K", row: 7, shields: 1 },
  { id: "red-7", side: "red", column: "N", row: 9, shields: 3 },
];

interface SiteSpec {
  readonly state: SiteState;
  readonly squares: readonly [ColumnLetter, number][];
}

const SITE_SPECS: readonly SiteSpec[] = [
  {
    state: "charged",
    squares: [
      ["H", 8],
      ["K", 11],
    ],
  },
  {
    state: "active",
    squares: [
      ["E", 5],
      ["K", 5],
      ["E", 11],
    ],
  },
  {
    state: "depleted",
    squares: [
      ["H", 4],
      ["H", 12],
    ],
  },
  {
    state: "dormant",
    squares: [
      ["F", 2],
      ["J", 2],
      ["B", 4],
      ["N", 4],
      ["D", 8],
      ["L", 8],
      ["B", 12],
      ["N", 12],
      ["F", 14],
      ["J", 14],
    ],
  },
];

/**
 * A complete, hand-picked (not a legal) `GameState`, used in place of
 * `startingGameState()` for the manual gates this story schedules. Green is
 * to move, with two actions remaining and nothing yet moved.
 */
export function reviewFixtureState(): GameState {
  const ships: Ship[] = SHIP_SPECS.map((spec) => ({
    id: spec.id,
    side: spec.side,
    square: squareAt(spec.column, spec.row),
    shields: spec.shields,
  }));

  const siteStates: Record<string, SiteState> = {};
  for (const { state, squares } of SITE_SPECS) {
    for (const [column, row] of squares) {
      siteStates[`${column}${row}`] = state;
    }
  }

  return {
    ships,
    siteStates,
    sideToMove: "green",
    actionsRemaining: ACTIONS_PER_PLY,
    movedThisPly: [],
  };
}
