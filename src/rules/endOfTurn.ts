// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Cooling a dormant site to active runs last,
// after the charge draw, deliberately (§8.6): it is what makes a site spend
// at least one whole turn visibly active before the draw can pick it,
// rather than going dormant -> active -> charged inside a single sequence.

import type { Square } from "./board";
import { squareName } from "./board";
import { type SiteChargedEffect, runChargeDraw } from "./chargeDraw";
import { chargedNodesHeldBy, energyForNodesHeld } from "./energy";
import type { Side, ShipId } from "./fleet";
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import {
  hasChargedNodeFinished,
  hasDormantSiteFinishedCooling,
  SITES,
} from "./sites";
import { MAX_SHIELDS, type ShieldCount } from "./shields";

/** A ship on a charged node gained a shield at the end of its side's turn (§8.6 step 1, §4.1). */
export interface ShieldGainedEffect {
  readonly type: "shield-gained";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly shields: ShieldCount;
}

/** The side that just played collected energy for the charged nodes it holds (§8.6 step 2, §8.4). */
export interface EnergyCollectedEffect {
  readonly type: "energy-collected";
  readonly side: Side;
  readonly amount: number;
  readonly newTotal: number;
  readonly squares: readonly Square[];
}

/** A charged node finished its nine turns and went dormant (§8.6 step 3, §8.3). */
export interface NodeRanOutEffect {
  readonly type: "node-ran-out";
  readonly square: Square;
}

/** A ship was left standing on a site that ran out underneath it (§8.6 step 3, §8.5). */
export interface ShipStrandedEffect {
  readonly type: "ship-stranded";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
}

/** A dormant site finished cooling down and went active (§8.6 step 5, §8.2). */
export interface SiteWentActiveEffect {
  readonly type: "site-went-active";
  readonly square: Square;
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | ShieldGainedEffect
  | EnergyCollectedEffect
  | NodeRanOutEffect
  | ShipStrandedEffect
  | SiteChargedEffect
  | SiteWentActiveEffect;

/** The state resulting from the end-of-turn sequence, and the effects it produced. */
export interface EndOfTurnResult {
  readonly state: GameState;
  readonly effects: readonly EndOfTurnEffect[];
}

/**
 * Runs §8.6's end-of-turn steps, in order, for the ply that is ending.
 * `state`'s `sideToMove` is read as the player who just played that ply and
 * `plyNumber` as the ply itself — the caller runs this **before** swapping
 * sides or advancing the ply counter.
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

  // Step 2: the moving side collects energy for the charged nodes it holds
  // right now (§8.4). A zero payout is not an event — no effect, no other
  // state change — so a player standing on nothing does not read as having
  // had something happen to them.
  const heldSquares = chargedNodesHeldBy(workingState, side);
  const amount = energyForNodesHeld(heldSquares.length);
  if (amount > 0) {
    const newTotal = workingState.energy[side] + amount;
    workingState = {
      ...workingState,
      energy: { ...workingState.energy, [side]: newTotal },
    };
    effects.push({
      type: "energy-collected",
      side,
      amount,
      newTotal,
      squares: heldSquares,
    });
  }

  // Step 3: charged nodes that have finished their nine turns go dormant
  // (§8.3), stranding any ship left standing on them (§8.5).
  let siteStates = workingState.siteStates;
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
      [name]: { state: "dormant", enteredOnPly: plyNumber },
    };
    effects.push({ type: "node-ran-out", square });

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

  // Step 4: as many active sites as it takes to bring the board back to
  // five charged are charged, at random (§8.2, §8.6 step 4). Running short
  // is legal: with no active site left to draw from, this simply stops.
  const chargeDraw = runChargeDraw(workingState);
  workingState = chargeDraw.state;
  effects.push(...chargeDraw.effects);

  // Step 5: dormant sites that have finished cooling go active (§8.2). This
  // runs last, deliberately: it is what makes a site spend at least one
  // whole turn visibly active before the charge draw can pick it, rather
  // than going dormant -> active -> charged inside a single end-of-turn
  // sequence.
  siteStates = workingState.siteStates;
  for (const square of SITES) {
    const name = squareName(square);
    const status = siteStates[name];
    if (
      status === undefined ||
      status.state !== "dormant" ||
      !hasDormantSiteFinishedCooling(status.enteredOnPly, plyNumber)
    ) {
      continue;
    }
    siteStates = {
      ...siteStates,
      [name]: { state: "active", enteredOnPly: plyNumber },
    };
    effects.push({ type: "site-went-active", square });
  }
  workingState = { ...workingState, siteStates };

  return { state: workingState, effects };
}
