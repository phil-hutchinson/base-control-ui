// The two sides and the starting fleet (rules.md §4): seven ships a side,
// one per bay, alternating clockwise from H15.

import { type Square, squareAt, squareName } from "./board";
import type { ShieldCount } from "./shields";

/** The two sides (rules.md §4). */
export type Side = "green" | "red";

/** One ship's starting square, side and shield count. */
export interface FleetEntry {
  readonly square: Square;
  readonly side: Side;
  readonly shields: ShieldCount;
}

/**
 * The starting fleet, in the clockwise order rules.md §4 states it, starting
 * at H15. Every ship starts on 0 shields.
 */
export const STARTING_FLEET: readonly FleetEntry[] = [
  { square: squareAt("H", 15), side: "green", shields: 0 },
  { square: squareAt("L", 15), side: "red", shields: 0 },
  { square: squareAt("O", 14), side: "green", shields: 0 },
  { square: squareAt("O", 10), side: "red", shields: 0 },
  { square: squareAt("O", 6), side: "green", shields: 0 },
  { square: squareAt("O", 2), side: "red", shields: 0 },
  { square: squareAt("L", 1), side: "green", shields: 0 },
  { square: squareAt("H", 1), side: "red", shields: 0 },
  { square: squareAt("D", 1), side: "green", shields: 0 },
  { square: squareAt("A", 2), side: "red", shields: 0 },
  { square: squareAt("A", 6), side: "green", shields: 0 },
  { square: squareAt("A", 10), side: "red", shields: 0 },
  { square: squareAt("A", 14), side: "green", shields: 0 },
  { square: squareAt("D", 15), side: "red", shields: 0 },
];

const STARTING_ENTRY_BY_SQUARE: ReadonlyMap<string, FleetEntry> = new Map(
  STARTING_FLEET.map((entry) => [squareName(entry.square), entry]),
);

/** The ship (if any) that starts the game on the given square. */
export function startingShipAt(square: Square): FleetEntry | undefined {
  return STARTING_ENTRY_BY_SQUARE.get(squareName(square));
}
