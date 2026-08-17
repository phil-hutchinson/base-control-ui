// The seventeen site squares (rules.md §3.2).

import { type Square, squareAt } from "./board";

/**
 * The seventeen site squares, in the row order rules.md §3.2 lists them
 * (bottom to top, left to right within a row).
 */
export const SITES: readonly Square[] = [
  // Row 2
  squareAt("F", 2),
  squareAt("J", 2),
  // Row 4
  squareAt("B", 4),
  squareAt("H", 4),
  squareAt("N", 4),
  // Row 5
  squareAt("E", 5),
  squareAt("K", 5),
  // Row 8
  squareAt("D", 8),
  squareAt("H", 8),
  squareAt("L", 8),
  // Row 11
  squareAt("E", 11),
  squareAt("K", 11),
  // Row 12
  squareAt("B", 12),
  squareAt("H", 12),
  squareAt("N", 12),
  // Row 14
  squareAt("F", 14),
  squareAt("J", 14),
];
