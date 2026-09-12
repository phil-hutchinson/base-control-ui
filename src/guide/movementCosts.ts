// The movement diagram's cost figures, derived from §6's shapes rather than
// transcribed by hand, so a change to the rules table cannot leave the
// diagram behind (rules.md §6). Knows nothing about grids, CSS or React —
// `GuideDiagram` and the movement diagram place these offsets on a page.

import { COLUMN_LETTERS, squareAt } from "../rules/board";
import { allShapesFrom } from "../rules/movement";
import type { PowerLevel } from "../rules/power";

/** One square reachable in a move, as an offset from the ship's origin. */
export interface MovementCostOffset {
  readonly deltaColumn: number;
  readonly deltaRow: number;
  readonly cost: PowerLevel;
}

/**
 * A square at least three files and three ranks from every edge, so
 * `allShapesFrom` clips nothing. Any such square gives the same answer
 * (`movementCostOffsets`'s own test checks a second one).
 */
const CENTRAL_ORIGIN = squareAt("H", 8);

/**
 * Every square reachable in one move from a central square, as an offset
 * from that square, with what it costs (rules.md §6): the four orthogonal
 * neighbours at 0, the four diagonal neighbours at 1, the twelve two-step
 * squares — four straight, eight L-shaped — at 2, and the sixteen squares
 * that cost 3 — four three squares orthogonally, four two squares
 * diagonally, and eight long knight. The twelve offsets (±2, ±3),
 * (±3, ±2) and (±3, ±3) are not reachable by any shape and are absent, and so
 * is the centre itself. If two shapes were ever to reach the same offset, the
 * cheaper is kept.
 */
export function movementCostOffsets(): readonly MovementCostOffset[] {
  const originColumnIndex = COLUMN_LETTERS.indexOf(CENTRAL_ORIGIN.column);
  const byOffset = new Map<string, MovementCostOffset>();

  for (const entry of allShapesFrom(CENTRAL_ORIGIN)) {
    const deltaColumn =
      COLUMN_LETTERS.indexOf(entry.destination.column) - originColumnIndex;
    const deltaRow = entry.destination.row - CENTRAL_ORIGIN.row;
    const key = `${deltaColumn},${deltaRow}`;

    const existing = byOffset.get(key);
    if (existing === undefined || entry.cost < existing.cost) {
      byOffset.set(key, { deltaColumn, deltaRow, cost: entry.cost });
    }
  }

  return Array.from(byOffset.values());
}
