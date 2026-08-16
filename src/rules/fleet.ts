// The two sides and the starting fleet (rules.md §4): seven ships a side,
// one per bay, alternating clockwise from H15.

import { type Square, squareAt, squareName } from "./board";

/** The two sides. Green takes the first turn. */
export type Side = "green" | "red";

/** One ship's starting square and side. */
export interface FleetEntry {
  readonly square: Square;
  readonly side: Side;
}

/**
 * The starting fleet, in the clockwise order rules.md §4 states it, starting
 * at H15.
 */
export const STARTING_FLEET: readonly FleetEntry[] = [
  { square: squareAt("H", 15), side: "green" },
  { square: squareAt("L", 15), side: "red" },
  { square: squareAt("O", 14), side: "green" },
  { square: squareAt("O", 10), side: "red" },
  { square: squareAt("O", 6), side: "green" },
  { square: squareAt("O", 2), side: "red" },
  { square: squareAt("L", 1), side: "green" },
  { square: squareAt("H", 1), side: "red" },
  { square: squareAt("D", 1), side: "green" },
  { square: squareAt("A", 2), side: "red" },
  { square: squareAt("A", 6), side: "green" },
  { square: squareAt("A", 10), side: "red" },
  { square: squareAt("A", 14), side: "green" },
  { square: squareAt("D", 15), side: "red" },
];

const STARTING_SIDE_BY_SQUARE: ReadonlyMap<string, Side> = new Map(
  STARTING_FLEET.map((entry) => [squareName(entry.square), entry.side]),
);

/** The side (if any) whose ship starts the game on the given square. */
export function startingSideAt(square: Square): Side | undefined {
  return STARTING_SIDE_BY_SQUARE.get(squareName(square));
}
