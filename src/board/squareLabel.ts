// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" if the square is one, then which side's ship
// (if any) stands there, then that ship's shield count. Ordinary empty
// squares are named by their square name alone. The shield count is stated
// even when it is zero, so a listener hearing one square at a time can tell a
// shieldless ship apart from an app that never reports shields at all.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { ShieldCount } from "../rules/shields";

/** A square's occupant, as far as its accessible name is concerned. */
export interface SquareOccupant {
  readonly side: Side;
  readonly shields: ShieldCount;
}

/** Builds a square's accessible name from its name, bay status and occupant. */
export function squareLabel(
  square: Square,
  isBay: boolean,
  occupant: SquareOccupant | undefined,
): string {
  const segments = [squareName(square)];
  if (isBay) {
    segments.push("bay");
  }
  if (occupant) {
    segments.push(`${occupant.side} ship`);
    const unit = occupant.shields === 1 ? "shield" : "shields";
    segments.push(`${occupant.shields} ${unit}`);
  }
  return segments.join(", ");
}
