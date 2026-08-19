// The wording of a square's accessible name: comma-separated segments, the
// square name first, then "bay" or "<state> site" if the square is one of
// those, then a bay's return-position cues (return position 1, the current
// receptacle, or both) if it carries any, then which side's ship (if any)
// stands there, then that ship's shield count, then whether it has already
// acted this ply, then its condition (no action available, or owing an
// action), then last of all a mark saying that the square is selected, a
// legal destination, or a legal attack target. A square is never both a bay
// and a site, so the two share one slot. Having acted, the condition and the
// mark are three separately optional fields, each computed on its own: a
// ship that has not yet acted can still carry the no-action condition (a
// pinned ship, selectable but fruitless), and the mark reflects the current
// selection or highlight independently of both — the condition alone
// staying mutually exclusive within itself. Ordinary empty squares are named
// by their square name alone. The shield count is stated even when it is
// zero, so a listener hearing one square at a time can tell a shieldless
// ship apart from an app that never reports shields at all.
//
// A target square's mark names the fight's predicted outcome rather than a
// fixed phrase, so a listener does not have to hold two ships' shield counts
// across two focus stops to work out who would win.
//
// The return-position cues are independent of the selected/destination/
// target mark, since a bay can be return position 1, the current
// receptacle and a legal destination all at once (rules.md §7.1).

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
 * A fight's predicted outcome (rules.md §7), from the selected ship's own
 * point of view: it is always the attacker in the fight a target square's
 * name predicts, since only a selected ship's own activation of an enemy
 * square produces a target mark.
 */
export type PredictedFightOutcome =
  "attacker-won" | "defender-won" | "mutual-return";

/**
 * A mark a square carries during ship selection: the selected ship's own
 * square, a square the selected ship may legally move to, or a square it may
 * legally attack, carrying the fight's predicted outcome. One exclusive
 * slot, because the three cannot co-occur: the selected ship's own square is
 * neither a destination nor a target, a destination must be empty, and a
 * target must hold an enemy ship. The outcome lives on the mark itself, not
 * a separate field, so a target can never be built without one.
 */
export type SquareMark =
  | "selected"
  | "destination"
  | { readonly kind: "target"; readonly outcome: PredictedFightOutcome };

/** How the selected and destination marks read in a square's accessible name. */
const MARK_WORDING: Record<"selected" | "destination", string> = {
  selected: "selected",
  destination: "can move here",
};

/** How a target square's predicted outcome reads in its accessible name. */
const PREDICTED_OUTCOME_WORDING: Record<PredictedFightOutcome, string> = {
  "attacker-won": "can attack here, your ship would win",
  "defender-won": "can attack here, your ship would lose",
  "mutual-return": "can attack here, both ships would return to bays",
};

/**
 * The return-position cues a bay square carries (rules.md §7.1), independent
 * of `mark`: a bay can be return position 1, the bay a beaten ship would
 * actually land in right now (the receptacle), or both at once — when
 * position 1 happens to be empty — and can also be a legal destination for
 * the selected ship at the same time.
 */
export type ReturnCue =
  "return-position" | "receptacle" | "return-position-and-receptacle";

/**
 * How each return cue reads in a square's accessible name. "return position
 * 1" is rules.md §7.1's own phrase, so the rulebook and the app agree.
 */
const RETURN_CUE_WORDING: Record<ReturnCue, string> = {
  "return-position": "return position 1",
  receptacle: "next bay for a beaten ship",
  "return-position-and-receptacle":
    "return position 1, next bay for a beaten ship",
};

/** How having acted this ply reads in a square's accessible name. */
const ALREADY_ACTED_WORDING = "already acted this turn";

/**
 * A ship's own condition, independent of the current selection and of
 * whether it has acted: it has no legal action available at all — no legal
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
  /** A return-position cue (rules.md §7.1), emitted right after the bay/site segment; only bays ever carry one. */
  readonly returnCue?: ReturnCue;
  readonly occupant?: SquareOccupant;
  readonly hasActed?: boolean;
  readonly condition?: ShipCondition;
  readonly mark?: SquareMark;
}

/** Builds a square's accessible name from its name, bay/site status, return cues, occupant, having acted, condition and mark. */
export function squareLabel({
  square,
  isBay,
  siteState,
  returnCue,
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
  if (returnCue) {
    segments.push(RETURN_CUE_WORDING[returnCue]);
  }
  if (occupant) {
    segments.push(`${occupant.side} ship`);
    const unit = occupant.shields === 1 ? "shield" : "shields";
    segments.push(`${occupant.shields} ${unit}`);
  }
  if (hasActed) {
    segments.push(ALREADY_ACTED_WORDING);
  }
  if (condition) {
    segments.push(CONDITION_WORDING[condition]);
  }
  if (mark) {
    segments.push(
      typeof mark === "string"
        ? MARK_WORDING[mark]
        : PREDICTED_OUTCOME_WORDING[mark.outcome],
    );
  }
  return segments.join(", ");
}
