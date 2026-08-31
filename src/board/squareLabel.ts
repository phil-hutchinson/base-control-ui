// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then which side's ship (if any) stands there, then that ship's
// power level, then whether it has already acted this ply, then its
// condition (no action available), then last of all a mark saying that the
// square is selected, a legal destination, or a legal attack target. A
// square is never both a bay and a site, so the two share one slot. Having
// acted, the condition and the mark are three separately optional fields,
// each computed on its own: a ship that has not yet acted can still carry
// the no-action condition (a pinned ship, selectable but fruitless), and
// the mark reflects the current selection or highlight independently of
// both. `ShipCondition` currently has a single member, and
// `CONDITION_WORDING` is where its wording lives. Ordinary empty squares
// are named by their square name alone. The power level is stated even
// when it is zero, so a listener hearing one square at a time can tell a
// drained ship apart from an app that never reports power at all.
//
// A fight has one outcome (rules.md §7), so a target square's mark is a
// fixed phrase saying what attacking there does, the same as the selected
// and destination marks.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import type { PowerLevel } from "../rules/power";
import type { SiteState } from "../rules/sites";

/** A square's occupant, as far as its accessible name is concerned. */
export interface SquareOccupant {
  readonly side: Side;
  readonly power: PowerLevel;
}

/**
 * A mark a square carries during ship selection: the selected ship's own
 * square, a square the selected ship may legally move to, or a square it may
 * legally attack. One exclusive slot, because the three cannot co-occur: the
 * selected ship's own square is neither a destination nor a target, a
 * destination must be empty, and a target must hold an enemy ship.
 */
export type SquareMark = "selected" | "destination" | "target";

/** How each mark reads in a square's accessible name. */
const MARK_WORDING: Record<SquareMark, string> = {
  selected: "selected",
  destination: "can move here",
  target: "can attack here, both ships would return to bays",
};

/** How having acted this ply reads in a square's accessible name. */
const ALREADY_ACTED_WORDING = "already acted this turn";

/**
 * A ship's own condition, independent of the current selection and of
 * whether it has acted: it has no legal action available at all — no legal
 * move and no legal attack target.
 */
export type ShipCondition = "no-action";

/** How each condition reads in a square's accessible name, in the players' vocabulary. */
const CONDITION_WORDING: Record<ShipCondition, string> = {
  "no-action": "no action available this turn",
};

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  readonly square: Square;
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
  readonly hasActed?: boolean;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

/** Builds a square's accessible name from its name, bay/site status, occupant, having acted, condition and mark. */
export function squareLabel({
  square,
  isBay,
  siteState,
  occupant,
  hasActed,
  condition,
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
    segments.push(`power ${occupant.power} of 4`);
  }
  if (hasActed) {
    segments.push(ALREADY_ACTED_WORDING);
  }
  if (condition) {
    segments.push(CONDITION_WORDING[condition]);
  }
  if (mark) {
    segments.push(MARK_WORDING[mark]);
  }
  return segments.join(", ");
}
