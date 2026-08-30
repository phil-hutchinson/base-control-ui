// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Two ordering choices matter and both are
// deliberate (§8.6). Pressure (step 5) is gained after the charge draw
// (step 4), not before, so a site is drawn at the pressure it held all
// turn — its first appearance in a draw is at weight 1, never 2.
// Recovering a dormant site to active (step 6) runs last, after both of
// those, deliberately: it is what makes a site spend at least one whole
// turn visibly active before the draw can pick it, rather than going
// dormant -> active -> charged inside a single sequence. And the two
// clocks are symmetric about the turn a state is entered: a node charged
// in step 4 of turn N first drains in step 3 of turn N+1, and a node that
// goes dormant in step 3 of turn N first recovers in step 6 of turn N+1 —
// which is why step 6 works from the dormant set captured at entry, before
// step 3 runs.

import type { Square } from "./board";
import { squareName } from "./board";
import { type SiteChargedEffect, runChargeDraw } from "./chargeDraw";
import {
  chargedNodesHeldBy,
  dormantSitesOccupiedBy,
  energyForDormantSites,
  energyForNodesHeld,
} from "./energy";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type SiteStatus,
  dormantSiteNames,
  shipsBySquare,
  siteStateAt,
} from "./gameState";
import {
  DORMANT_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  PRESSURE_CAP,
  SITES,
  STARTING_PRESSURE,
  drawTableAmount,
} from "./sites";
import { MAX_SHIELDS, MIN_SHIELDS, type ShieldCount } from "./shields";

/** A ship on a charged node gained a shield at the end of its side's turn (§8.6 step 1, §4.1). */
export interface ShieldGainedEffect {
  readonly type: "shield-gained";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly shields: ShieldCount;
}

/** A ship on a dormant site lost a shield at the end of its side's turn (§8.6 step 1, §4.1). */
export interface ShieldLostEffect {
  readonly type: "shield-lost";
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

/**
 * The side that just played paid energy for the dormant sites it occupies
 * (§8.6 step 2, §8.4). `amount` is the energy actually deducted, never more
 * than the side had — where §8.4's floor of 0 bites, `amount` is smaller
 * than the table price, so `newTotal` is always `previousTotal - amount`
 * exactly.
 */
export interface EnergyPenaltyEffect {
  readonly type: "energy-penalty";
  readonly side: Side;
  readonly amount: number;
  readonly newTotal: number;
  readonly squares: readonly Square[];
}

/** A charged node's drain reached its capacity and it went dormant (§8.6 step 3, §8.3). */
export interface NodeRanOutEffect {
  readonly type: "node-ran-out";
  readonly square: Square;
}

/** A dormant site finished recovering and went active, at pressure 1 (§8.6 step 6, §8.2). */
export interface SiteWentActiveEffect {
  readonly type: "site-went-active";
  readonly square: Square;
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | ShieldGainedEffect
  | ShieldLostEffect
  | EnergyCollectedEffect
  | EnergyPenaltyEffect
  | NodeRanOutEffect
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
 *
 * Step 6 must recover exactly the sites that were dormant before this ply
 * began, never one that only goes dormant during this very sequence, in step
 * 3 below. The set is captured here, at entry, before step 3 runs — it is
 * exact because no action changes a site's state (rules.md §8.6), so the set
 * of dormant sites when this function is entered is exactly the set from the
 * start of the ply.
 */
export function runEndOfTurn(state: GameState): EndOfTurnResult {
  const dormantBeforePly = dormantSiteNames(state);
  const side = state.sideToMove;
  const occupants = shipsBySquare(state);
  const effects: EndOfTurnEffect[] = [];

  // Step 1: the moving player's ships on charged nodes gain a shield,
  // capped at 4, and those on dormant sites lose one, floored at 0 (§4.1).
  // An active site does neither. One pass over the fleet, so the effects
  // come out in fleet order with gains and losses interleaved exactly as
  // the ships are ordered.
  const ships = state.ships.map((ship) => {
    if (ship.side !== side) {
      return ship;
    }
    const siteState = siteStateAt(state, ship.square);
    if (siteState === "charged" && ship.shields < MAX_SHIELDS) {
      const shields = (ship.shields + 1) as ShieldCount;
      effects.push({
        type: "shield-gained",
        shipId: ship.id,
        side: ship.side,
        square: ship.square,
        shields,
      });
      return { ...ship, shields };
    }
    if (siteState === "dormant" && ship.shields > MIN_SHIELDS) {
      const shields = (ship.shields - 1) as ShieldCount;
      effects.push({
        type: "shield-lost",
        shipId: ship.id,
        side: ship.side,
        square: ship.square,
        shields,
      });
      return { ...ship, shields };
    }
    return ship;
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

  // Step 2 (continued): the moving side then pays for the dormant sites it
  // occupies right now (§8.4), taken from the total the collection above
  // has already raised. The table price is clamped to a count of five
  // dormant sites; the amount actually taken is floored so the side's total
  // never goes below 0, and it is that floored amount — not the table
  // price — that is reported, so `newTotal` is always exactly
  // `previousTotal - amount`. A zero deduction is not an event, whether
  // because nothing dormant is occupied or because there is nothing left to
  // take: no effect, no other state change.
  const dormantSquares = dormantSitesOccupiedBy(workingState, side);
  const price = energyForDormantSites(dormantSquares.length);
  const penalty = Math.min(price, workingState.energy[side]);
  if (penalty > 0) {
    const newTotal = workingState.energy[side] - penalty;
    workingState = {
      ...workingState,
      energy: { ...workingState.energy, [side]: newTotal },
    };
    effects.push({
      type: "energy-penalty",
      side,
      amount: penalty,
      newTotal,
      squares: dormantSquares,
    });
  }

  // Step 3: every charged node adds its drain — drawn from the held table if
  // a ship of either side is standing on it right now, the empty table
  // otherwise — and any that reaches capacity goes dormant carrying its
  // drain unclamped (§8.3). A ship left standing on it simply stays there,
  // collecting nothing (§8.5).
  for (const square of SITES) {
    const name = squareName(square);
    const status = workingState.siteStates[name];
    if (status === undefined || status.state !== "charged") {
      continue;
    }
    const table = occupants.has(name)
      ? HELD_NODE_DRAIN_TABLE
      : EMPTY_NODE_DRAIN_TABLE;
    const [drawnAmount, nextSeed] = drawTableAmount(
      workingState.randomSeed,
      table,
    );
    const level = status.level + drawnAmount;
    const nextStatus: SiteStatus =
      level < NODE_CAPACITY
        ? { state: "charged", level }
        : { state: "dormant", level };
    workingState = {
      ...workingState,
      siteStates: { ...workingState.siteStates, [name]: nextStatus },
      randomSeed: nextSeed,
    };

    if (nextStatus.state === "dormant") {
      effects.push({ type: "node-ran-out", square });
    }
  }

  // Step 4: as many active sites as it takes to bring the board back to
  // five charged are charged, at random (§8.2, §8.6 step 4). Running short
  // is legal: with no active site left to draw from, this simply stops.
  const chargeDraw = runChargeDraw(workingState);
  workingState = chargeDraw.state;
  effects.push(...chargeDraw.effects);

  // Step 5: every site still active gains a point of pressure, to the cap
  // of 50 (§8.2). This runs after the charge draw, so a site is drawn at
  // the pressure it held all turn — its first appearance in a draw is at
  // weight 1, not 2 — and it runs before step 6, so a site that goes active
  // there starts at pressure 1 untouched by this step.
  for (const square of SITES) {
    const name = squareName(square);
    const status = workingState.siteStates[name];
    if (status === undefined || status.state !== "active") {
      continue;
    }
    if (status.level >= PRESSURE_CAP) {
      continue;
    }
    workingState = {
      ...workingState,
      siteStates: {
        ...workingState.siteStates,
        [name]: { state: "active", level: status.level + 1 },
      },
    };
  }

  // Step 6: every site that was dormant before this ply began (the
  // `dormantBeforePly` set captured at entry, above) subtracts its
  // recovery; any that reaches zero or below goes active, at pressure 1
  // (§8.2). A site that only went dormant during this very sequence — in
  // step 3 above — was charged when the ply began, so it is excluded and
  // first recovers at the end of the next ply.
  for (const square of SITES) {
    const name = squareName(square);
    const status = workingState.siteStates[name];
    if (
      status === undefined ||
      status.state !== "dormant" ||
      !dormantBeforePly.has(name)
    ) {
      continue;
    }
    const [drawnAmount, nextSeed] = drawTableAmount(
      workingState.randomSeed,
      DORMANT_RECOVERY_TABLE,
    );
    const level = status.level - drawnAmount;
    const nextStatus: SiteStatus =
      level > 0
        ? { state: "dormant", level }
        : { state: "active", level: STARTING_PRESSURE };
    workingState = {
      ...workingState,
      siteStates: { ...workingState.siteStates, [name]: nextStatus },
      randomSeed: nextSeed,
    };

    if (nextStatus.state === "active") {
      effects.push({ type: "site-went-active", square });
    }
  }

  return { state: workingState, effects };
}
