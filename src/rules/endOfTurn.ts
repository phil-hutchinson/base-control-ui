// §8.7's end-of-turn sequence: the six steps run once at the end of every
// ply, in the document's order. Reads `state.sideToMove` as the player who
// just moved and `state.plyNumber` as the ply just played, so `ply.ts` must
// call this before either changes.

import { driftReturnPositionIndex } from "./bays";
import type { Square } from "./board";
import { squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import {
  type SiteCooledEffect,
  type SiteWokenEffect,
  drawReplacements,
} from "./nodes";
import {
  hasChargedNodeFinished,
  hasDepletedSiteFinishedCooling,
  SITES,
} from "./sites";
import { MAX_SHIELDS, type ShieldCount } from "./shields";

/** A ship on a charged node gained a shield at the end of its side's turn (§8.7 step 1, §4.1). */
export interface ShieldGainedEffect {
  readonly type: "shield-gained";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly shields: ShieldCount;
}

/** A charged node finished its nine turns and went depleted (§8.7 step 4, §8.3). */
export interface NodeRanOutEffect {
  readonly type: "node-ran-out";
  readonly square: Square;
}

/** A ship was left standing on a site that ran out underneath it (§8.7 step 4, §8.5). */
export interface ShipStrandedEffect {
  readonly type: "ship-stranded";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | ShieldGainedEffect
  | SiteCooledEffect
  | NodeRanOutEffect
  | ShipStrandedEffect
  | SiteWokenEffect;

/** The state resulting from the end-of-turn sequence, and the effects it produced. */
export interface EndOfTurnResult {
  readonly state: GameState;
  readonly effects: readonly EndOfTurnEffect[];
}

/**
 * Runs §8.7's six steps, in order, for the ply that is ending. `state`'s
 * `sideToMove` is read as the player who just played that ply and
 * `plyNumber` as the ply itself — the caller runs this **before** swapping
 * sides or advancing the ply counter.
 *
 * Step 2 (influence) is a deliberately empty slot awaiting its own story;
 * every other step, including step 6, runs unconditionally.
 */
export function runEndOfTurn(state: GameState): EndOfTurnResult {
  const side = state.sideToMove;
  const plyNumber = state.plyNumber;
  const occupants = shipsBySquare(state);
  const effects: EndOfTurnEffect[] = [];

  // Step 1: the moving player's ships on charged nodes gain a shield,
  // capped at 4 (§4.1). An active site grants nothing.
  const ships = state.ships.map((ship) => {
    if (
      ship.side !== side ||
      ship.shields >= MAX_SHIELDS ||
      siteStateAt(state, ship.square) !== "charged"
    ) {
      return ship;
    }
    const shields = (ship.shields + 1) as ShieldCount;
    effects.push({
      type: "shield-gained",
      shipId: ship.id,
      side: ship.side,
      square: ship.square,
      shields,
    });
    return { ...ship, shields };
  });
  let workingState: GameState = { ...state, ships };

  // Step 2: influence (§8.4) — awaits its own story. No total is kept.

  // Step 3: depleted sites that have finished cooling go dormant (§8.6).
  let siteStates = workingState.siteStates;
  for (const square of SITES) {
    const name = squareName(square);
    const status = siteStates[name];
    if (
      status === undefined ||
      status.state !== "depleted" ||
      !hasDepletedSiteFinishedCooling(status.enteredOnPly, plyNumber)
    ) {
      continue;
    }
    siteStates = {
      ...siteStates,
      [name]: { state: "dormant", enteredOnPly: plyNumber },
    };
    effects.push({ type: "site-cooled", square });
  }
  workingState = { ...workingState, siteStates };

  // Step 4: charged nodes that have finished their nine turns go depleted
  // (§8.3), stranding any ship left standing on them (§8.5).
  let ranOutCount = 0;
  siteStates = workingState.siteStates;
  for (const square of SITES) {
    const name = squareName(square);
    const status = siteStates[name];
    if (
      status === undefined ||
      status.state !== "charged" ||
      !hasChargedNodeFinished(status.enteredOnPly, plyNumber)
    ) {
      continue;
    }
    siteStates = {
      ...siteStates,
      [name]: { state: "depleted", enteredOnPly: plyNumber },
    };
    effects.push({ type: "node-ran-out", square });
    ranOutCount += 1;

    const occupant = occupants.get(name);
    if (occupant !== undefined) {
      effects.push({
        type: "ship-stranded",
        shipId: occupant.id,
        side: occupant.side,
        square,
      });
    }
  }
  workingState = { ...workingState, siteStates };

  // Step 5: one replacement draw for each node that just ran out, so five
  // sites are active or charged again (§8.6). Comes after step 3 so a site
  // freed this same ply is drawable.
  if (ranOutCount > 0) {
    const draw = drawReplacements(workingState, ranOutCount);
    workingState = draw.state;
    effects.push(...draw.effects);
  }

  // Step 6: the bay return position drifts one bay counter-clockwise
  // (§7.1), silently — no effect is produced, since the board already
  // carries the return-position cues on every square that needs them.
  workingState = {
    ...workingState,
    returnPositionIndex: driftReturnPositionIndex(
      workingState.returnPositionIndex,
    ),
  };

  return { state: workingState, effects };
}
