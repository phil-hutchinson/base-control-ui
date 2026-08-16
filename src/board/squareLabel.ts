// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" if the square is one, then which side's ship
// (if any) stands there. Ordinary empty squares are named by their square
// name alone - see plan decision 2 in the story's implementation plan.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";

/** Builds a square's accessible name from its name, bay status and occupant. */
export function squareLabel(
  square: Square,
  isBay: boolean,
  occupant: Side | undefined,
): string {
  const segments = [squareName(square)];
  if (isBay) {
    segments.push("bay");
  }
  if (occupant) {
    segments.push(`${occupant} ship`);
  }
  return segments.join(", ");
}
