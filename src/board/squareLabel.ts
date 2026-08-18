// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then which side's ship (if any) stands there, then that ship's
// shield count, then last of all a mark saying that the square is selected,
// is a legal destination, or holds a ship that has already moved this turn.
// A square is never both a bay and a site, so the two share one slot; the
// three marks are mutually exclusive too, so they share one field. Ordinary
// empty squares are named by their square name alone. The shield count is
// stated even when it is zero, so a listener hearing one square at a time
// can tell a shieldless ship apart from an app that never reports shields at
// all.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { ShieldCount } from "../rules/shields";
import type { SiteState } from "../rules/sites";

/** A square's occupant, as far as its accessible name is concerned. */
export interface SquareOccupant {
  readonly side: Side;
  readonly shields: ShieldCount;
}

/**
 * A mark a square carries during ship selection: the selected ship's own
 * square, a square the selected ship may legally move to, or a ship that has
 * already moved this ply.
 */
export type SquareMark = "selected" | "destination" | "already-moved";

/** How each mark reads in a square's accessible name, in the players' vocabulary. */
const MARK_WORDING: Record<SquareMark, string> = {
  selected: "selected",
  destination: "can move here",
  "already-moved": "already moved this turn",
};

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  readonly square: Square;
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
  readonly mark?: SquareMark;
}

/** Builds a square's accessible name from its name, bay/site status, occupant and mark. */
export function squareLabel({
  square,
  isBay,
  siteState,
  occupant,
  mark,
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
  if (mark) {
    segments.push(MARK_WORDING[mark]);
  }
  return segments.join(", ");
}
