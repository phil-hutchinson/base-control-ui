// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then which side's ship (if any) stands there, then that ship's
// shield count. A square is never both a bay and a site, so the two share one
// slot. Ordinary empty squares are named by their square name alone. The
// shield count is stated even when it is zero, so a listener hearing one
// square at a time can tell a shieldless ship apart from an app that never
// reports shields at all.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { ShieldCount } from "../rules/shields";
import type { SiteState } from "../rules/sites";

/** A square's occupant, as far as its accessible name is concerned. */
export interface SquareOccupant {
  readonly side: Side;
  readonly shields: ShieldCount;
}

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  readonly square: Square;
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
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
    segments.push(`${occupant.side} ship`);
    const unit = occupant.shields === 1 ? "shield" : "shields";
    segments.push(`${occupant.shields} ${unit}`);
  }
  return segments.join(", ");
}
