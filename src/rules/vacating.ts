// §8.7's vacating rule: a charged node that is occupied goes dormant the
// instant it becomes unoccupied. Applied here as one function over the
// state an action started from and the state it produced, run immediately
// after the action resolves — before `runEndOfTurn` (§8.6) — so a vacated
// node is already dormant by the time the end-of-turn sequence and the
// opponent's turn see it. The rule is stated once, in the terms that settle
// every case (rules.md §8.7): a beaten defender replaced by the advancing
// attacker, a drawn fight, a blocked advance and a ship simply moving off a
// node all fall out of the same comparison, with no case for any of them.

import { type Square, squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import { type GameState, type SiteStatus, shipsBySquare } from "./gameState";
import { SITES } from "./sites";

/** A charged node went dormant because the ship standing on it left (rules.md §8.7). */
export interface NodeVacatedEffect {
  readonly type: "node-vacated";
  readonly square: Square;
  readonly shipId: ShipId;
  readonly side: Side;
}

/** The state resulting from applying the vacating rule, and the effects it produced. */
export interface VacatingResult {
  readonly state: GameState;
  readonly effects: readonly NodeVacatedEffect[];
}

/**
 * Applies rules.md §8.7 to the state an action produced, given the state it
 * started from: any site that is charged in `after`, was occupied in
 * `before`, and is unoccupied in `after`, goes dormant carrying its `level`
 * unchanged, and raises a `NodeVacatedEffect` naming the ship that left it —
 * read from `before`, since by definition nobody stands there afterwards. A
 * ship arriving on a node is not a departure and leaves the site untouched,
 * and so does a beaten defender's square, which is occupied again by the
 * advancing attacker in the very same `after` state.
 *
 * Walks `SITES` in its declared order, so the effects come out in a stable
 * order. This draws no randomness and consumes no seed.
 */
export function applyVacating(
  before: GameState,
  after: GameState,
): VacatingResult {
  const beforeOccupants = shipsBySquare(before);
  const afterOccupants = shipsBySquare(after);
  const effects: NodeVacatedEffect[] = [];
  let siteStates = after.siteStates;

  for (const square of SITES) {
    const name = squareName(square);
    const status = siteStates[name];
    if (status === undefined || status.state !== "charged") {
      continue;
    }
    if (!beforeOccupants.has(name) || afterOccupants.has(name)) {
      continue;
    }

    const leavingShip = beforeOccupants.get(name);
    if (leavingShip === undefined) {
      throw new RangeError(
        `site "${name}" was occupied before this action but has no occupant on record`,
      );
    }

    const nextStatus: SiteStatus = { state: "dormant", level: status.level };
    siteStates = { ...siteStates, [name]: nextStatus };
    effects.push({
      type: "node-vacated",
      square,
      shipId: leavingShip.id,
      side: leavingShip.side,
    });
  }

  return { state: { ...after, siteStates }, effects };
}
