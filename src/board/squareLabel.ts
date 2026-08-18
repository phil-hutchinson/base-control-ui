// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then which side's ship (if any) stands there, then that ship's
// shield count, then whether it has already moved this ply, then its
// condition (no action available, or owing an action), then last of all a
// mark saying that the square is selected or is a legal destination. A
// square is never both a bay and a site, so the two share one slot. Having
// moved, the condition and the mark are three separate, independently
// optional fields — a ship can have moved and still be selected, or moved
// and still have no action left — the condition alone staying mutually
// exclusive within itself. Ordinary empty squares are named by their square
// name alone. The shield count is stated even when it is zero, so a listener
// hearing one square at a time can tell a shieldless ship apart from an app
// that never reports shields at all.

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
 * square, or a square the selected ship may legally move to.
 */
export type SquareMark = "selected" | "destination";

/** How each mark reads in a square's accessible name, in the players' vocabulary. */
const MARK_WORDING: Record<SquareMark, string> = {
  selected: "selected",
  destination: "can move here",
};

/** How having moved this ply reads in a square's accessible name. */
const ALREADY_MOVED_WORDING = "already moved this turn";

/**
 * A ship's own condition, independent of the current selection and of
 * whether it has moved: it has no legal action available at all — no legal
 * move and no legal attack target — or it owes its owner an action under
 * §8.5.
 */
export type ShipCondition = "no-action" | "owes-action";

/** How each condition reads in a square's accessible name, in the players' vocabulary. */
const CONDITION_WORDING: Record<ShipCondition, string> = {
  "no-action": "no action available this turn",
  "owes-action": "stranded, must move this turn",
};

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  readonly square: Square;
  readonly isBay: boolean;
  readonly siteState?: SiteState;
  readonly occupant?: SquareOccupant;
  readonly hasMoved?: boolean;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

/** Builds a square's accessible name from its name, bay/site status, occupant, having moved, condition and mark. */
export function squareLabel({
  square,
  isBay,
  siteState,
  occupant,
  hasMoved,
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
    const unit = occupant.shields === 1 ? "shield" : "shields";
    segments.push(`${occupant.shields} ${unit}`);
  }
  if (hasMoved) {
    segments.push(ALREADY_MOVED_WORDING);
  }
  if (condition) {
    segments.push(CONDITION_WORDING[condition]);
  }
  if (mark) {
    segments.push(MARK_WORDING[mark]);
  }
  return segments.join(", ");
}
