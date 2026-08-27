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
