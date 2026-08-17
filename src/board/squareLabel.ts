// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then which side's ship (if any) stands there. A square is never
// both a bay and a site, so the two share one slot. Ordinary empty squares
// are named by their square name alone.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { SiteState } from "../rules/sites";

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  square: Square;
  isBay: boolean;
  siteState?: SiteState;
  occupant?: Side;
}

/** Builds a square's accessible name from its name, bay/site status and occupant. */
export function squareLabel({
  square,
  isBay,
  siteState,
  occupant,
}: SquareLabelDescriptor): string {
  const segments = [squareName(square)];
  if (isBay) {
    segments.push("bay");
  } else if (siteState) {
    segments.push(`${siteState} site`);
  }
  if (occupant) {
    segments.push(`${occupant} ship`);
  }
  return segments.join(", ");
}
