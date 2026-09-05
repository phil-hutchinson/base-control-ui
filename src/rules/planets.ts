// The twelve planet squares (rules.md §3.1): six base squares plus their
// half-turn rotations, computed rather than typed twice so the symmetry
// cannot be broken by a typo.

import { COLUMN_LETTERS, type Square, squareAt, squareName } from "./board";

/**
 * The six base planet squares rules.md §3.1 lists first. The other six are
 * each of these rotated a half-turn around the board's centre.
 */
const BASE_PLANET_SQUARES: readonly Square[] = [
  squareAt("B", 3),
  squareAt("D", 6),
  squareAt("G", 4),
  squareAt("J", 2),
  squareAt("K", 6),
  squareAt("N", 4),
];

/**
 * The square a half-turn rotation of the board sends `square` to: the
 * column becomes the column the same distance from the other end, and the
 * row becomes `16 - row` (rules.md §3.1).
 */
function rotateHalfTurn(square: Square): Square {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const rotatedColumn = COLUMN_LETTERS[COLUMN_LETTERS.length - 1 - columnIndex];
  return squareAt(rotatedColumn, 16 - square.row);
}

/**
 * The twelve planet squares (rules.md §3.1): the six base squares above,
 * plus each one's half-turn rotation.
 */
export const PLANETS: readonly Square[] = [
  ...BASE_PLANET_SQUARES,
  ...BASE_PLANET_SQUARES.map(rotateHalfTurn),
];

const PLANET_NAMES: ReadonlySet<string> = new Set(PLANETS.map(squareName));

/** Whether a square is one of the twelve planets. */
export function isPlanet(square: Square): boolean {
  return PLANET_NAMES.has(squareName(square));
}
