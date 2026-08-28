// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Recovering a dormant site to active runs
// last, after the charge draw, deliberately (§8.6): it is what makes a site
// spend at least one whole turn visibly active before the draw can pick it,
// rather than going dormant -> active -> charged inside a single sequence.
// And the two clocks are symmetric about the turn a state is entered: a
// node charged in step 4 of turn N first drains in step 3 of turn N+1, and a
// node that goes dormant in step 3 of turn N first recovers in step 6 of
// turn N+1 — which is what this file's second argument is for.

import type { Square } from "./board";
import { squareName } from "./board";
import { type SiteChargedEffect, runChargeDraw } from "./chargeDraw";
import { chargedNodesHeldBy, energyForNodesHeld } from "./energy";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type SiteStatus,
  shipsBySquare,
  siteStateAt,
} from "./gameState";
import {
  DORMANT_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  SITES,
  drawTableAmount,
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

/** A charged node's drain reached its capacity and it went dormant (§8.6 step 3, §8.3). */
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

/** A dormant site finished recovering and went active, at pressure 1 (§8.6 step 6, §8.2). */
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
 *
 * `dormantBeforePly` is the square names of every site that was dormant
 * before the ply began (§8.6 step 6). It is required, not optional, because
 * there is no safe default: step 6 must recover exactly those sites, never
 * one that only went dormant during this very ply — whether by reaching
 * capacity in step 3 below, or mid-ply because its occupant left it (§8.7) —
 * and nothing in `state` distinguishes such a site from one that has been
 * dormant for turns. Because `ACTIONS_PER_PLY` is 1 (rules.md §5), the state
 * before a ply's one action **is** the state at the start of the ply, so a
 * caller can build this set from that state with `dormantSiteNames`. A
 * future ruleset with more than one action per ply would need a genuine
 * start-of-ply snapshot carried in `GameState` instead.
 */
export function runEndOfTurn(
  state: GameState,
  dormantBeforePly: ReadonlySet<string>,
): EndOfTurnResult {
  const side = state.sideToMove;
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

  // Step 3: every charged node adds its drain — drawn from the held table if
  // a ship of either side is standing on it right now, the empty table
  // otherwise — and any that reaches capacity goes dormant carrying its
  // drain unclamped (§8.3), stranding any ship left standing on it (§8.5).
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
  }

  // Step 4: as many active sites as it takes to bring the board back to
  // five charged are charged, at random (§8.2, §8.6 step 4). Running short
  // is legal: with no active site left to draw from, this simply stops.
  const chargeDraw = runChargeDraw(workingState);
  workingState = chargeDraw.state;
  effects.push(...chargeDraw.effects);

  // Step 5: every site still active gains a point of pressure, to the cap
  // of 50 (§8.2). Not implemented yet — arrives in the next step of this
  // story's plan.

  // Step 6: every site that was dormant before this ply began (see this
  // function's doc comment on `dormantBeforePly`) subtracts its recovery;
  // any that reaches zero or below goes active, at pressure 1 (§8.2). A
  // site that only went dormant during this very sequence — in step 3
  // above, or earlier in the ply because its occupant left it (§8.7) — was
  // charged when the ply began, so it is excluded and first recovers at the
  // end of the next ply.
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
      level > 0 ? { state: "dormant", level } : { state: "active", level: 1 };
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
