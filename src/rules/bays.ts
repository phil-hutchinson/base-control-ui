// The fourteen bay squares (rules.md §3.1).

import { type Square, squareAt, squareName } from "./board";

/** The fourteen bay squares, in the order rules.md §3.1 lists them. */
export const BAYS: readonly Square[] = [
  // Top
  squareAt("D", 15),
  squareAt("H", 15),
  squareAt("L", 15),
  // Right
  squareAt("O", 14),
  squareAt("O", 10),
  squareAt("O", 6),
  squareAt("O", 2),
  // Bottom
  squareAt("D", 1),
  squareAt("H", 1),
  squareAt("L", 1),
  // Left
  squareAt("A", 2),
  squareAt("A", 6),
  squareAt("A", 10),
  squareAt("A", 14),
];

const BAY_NAMES: ReadonlySet<string> = new Set(BAYS.map(squareName));

/** Whether a square is one of the fourteen bays. */
export function isBay(square: Square): boolean {
  return BAY_NAMES.has(squareName(square));
}

/**
 * The fourteen bays in the clockwise ring rules.md §7.1 numbers around,
 * starting at H15. This is the same order §4 lists the starting fleet in,
 * and is a different ordering from `BAYS` above, which follows §3.1's table
 * (top, right, bottom, left).
 */
export const CLOCKWISE_BAYS: readonly Square[] = [
  squareAt("H", 15),
  squareAt("L", 15),
  squareAt("O", 14),
  squareAt("O", 10),
  squareAt("O", 6),
  squareAt("O", 2),
  squareAt("L", 1),
  squareAt("H", 1),
  squareAt("D", 1),
  squareAt("A", 2),
  squareAt("A", 6),
  squareAt("A", 10),
  squareAt("A", 14),
  squareAt("D", 15),
];

/**
 * The index in `CLOCKWISE_BAYS` of return position 1 on the first turn of
 * the game: H15 (rules.md §7.1).
 */
export const STARTING_RETURN_POSITION_INDEX = 0;

/**
 * The ring index one bay counter-clockwise from the given one — one step
 * backwards along `CLOCKWISE_BAYS`, wrapping. §8.7 step 6 uses this to drift
 * the return position at the end of every turn.
 */
export function driftReturnPositionIndex(index: number): number {
  return (index - 1 + CLOCKWISE_BAYS.length) % CLOCKWISE_BAYS.length;
}

/**
 * All fourteen bays in rules.md §7.1's numbering order for the given return
 * position 1: position 1 first, then 2, 3, 4 … clockwise around the ring,
 * wrapping.
 */
export function bayNumberingFrom(
  returnPositionIndex: number,
): readonly Square[] {
  return CLOCKWISE_BAYS.map(
    (_, offset) =>
      CLOCKWISE_BAYS[(returnPositionIndex + offset) % CLOCKWISE_BAYS.length],
  );
}
