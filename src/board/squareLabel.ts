// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "planet" or "<state> node" if the square is one of
// those, then which side's ship (if any) stands there, then that ship's
// power level, then its condition (cannot move or attack), then last of all
// a mark saying that the square is selected, a legal destination, or a legal
// attack target. A square is never both a planet and a node — the node draw
// excludes planets (rules.md §3.2) — so the two share one slot. The
// condition and the mark are two separately optional fields, each computed
// on its own: the mark reflects the current selection or highlight
// independently of the condition. `ShipCondition` currently has a single
// member, and `CONDITION_WORDING` is where its wording lives. Ordinary empty
// squares are named by their square name alone. The power level is stated
// even when it is zero, so a listener hearing one square at a time can tell
// a drained ship apart from an app that never reports power at all.
//
// A fight has one outcome (rules.md §7), so a target square's mark is a
// fixed phrase saying what attacking there does, the same as the selected
// and destination marks. A destination or a target also carries the cost of
// the move or the shot that reaches it (rules.md §6's price for the shape,
// §7's charge for the shot), and that cost is stated even when it is zero,
// for the same reason the power level is: a listener hearing no cost clause
// could not otherwise tell a free move from an app that never prices one.

import { squareName, type Square } from "../rules/board";
import type { Side } from "../rules/fleet";
import { MAX_POWER, type PowerLevel } from "../rules/power";
import type { NodeState } from "../rules/nodes";

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
 * destination must be empty, and a target must hold an enemy ship. A
 * destination or a target carries the `cost` (rules.md §6's price for the
 * shape that reaches it, §7's charge for the shot) that the rules layer
 * already computed when it decided the square was legal at all.
 */
export type SquareMark =
  | { readonly kind: "selected" }
  | { readonly kind: "destination"; readonly cost: PowerLevel }
  | { readonly kind: "target"; readonly cost: PowerLevel };

/** How a mark reads in a square's accessible name. */
function markWording(mark: SquareMark): string {
  switch (mark.kind) {
    case "selected":
      return "selected";
    case "destination":
      return `can move here, costs ${mark.cost} power`;
    case "target":
      return `can attack here, costs ${mark.cost} power, both ships would return to planets`;
  }
}

/**
 * A ship's own condition, independent of the current selection: it can
 * neither move nor attack.
 */
export type ShipCondition = "cannot-move-or-attack";

/** How each condition reads in a square's accessible name, in the players' vocabulary. */
const CONDITION_WORDING: Record<ShipCondition, string> = {
  "cannot-move-or-attack": "cannot move or attack this turn",
};

/** The information a square's accessible name is built from. */
export interface SquareLabelDescriptor {
  readonly square: Square;
  readonly isPlanet: boolean;
  readonly nodeState?: NodeState;
  readonly occupant?: SquareOccupant;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

/** Builds a square's accessible name from its name, planet/node status, occupant, condition and mark. */
export function squareLabel({
  square,
  isPlanet,
  nodeState,
  occupant,
  condition,
  mark,
}: SquareLabelDescriptor): string {
  const segments = [squareName(square)];
  if (isPlanet) {
    segments.push("planet");
  } else if (nodeState) {
    segments.push(`${nodeState} node`);
  }
  if (occupant) {
    segments.push(`${occupant.side} ship`);
    segments.push(`power ${occupant.power} of ${MAX_POWER}`);
  }
  if (condition) {
    segments.push(CONDITION_WORDING[condition]);
  }
  if (mark) {
    segments.push(markWording(mark));
  }
  return segments.join(", ");
}
