// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Two ordering choices matter and both are
// deliberate (§8.6). Pressure (step 5) is gained after the charge draw
// (step 4), not before, so a node is drawn at the pressure it held all
// turn — its first appearance in a draw is at weight 1, never 2.
// Recovering a depleted node to inactive (step 6) runs last, after both of
// those, deliberately: it is what makes a node spend at least one whole
// turn visibly inactive before the draw can pick it, rather than going
// depleted -> inactive -> charged inside a single sequence. And the two
// clocks are symmetric about the turn a state is entered: a node charged
// in step 4 of turn N first drains in step 3 of turn N+1, and a node that
// goes depleted in step 3 of turn N first recovers in step 6 of turn N+1 —
// which is why step 6 works from the depleted set captured at entry, before
// step 3 runs.

import type { Square } from "./board";
import { squareName } from "./board";
import { isBay } from "./bays";
import { type NodeChargedEffect, runChargeDraw } from "./chargeDraw";
import {
  chargedNodesHeldBy,
  depletedNodesOccupiedBy,
  energyForDepletedNodes,
  energyForNodesHeld,
} from "./energy";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type NodeStatus,
  depletedNodeNames,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import { MAX_POWER, MIN_POWER, type PowerLevel } from "./power";
import {
  DEPLETED_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  PRESSURE_CAP,
  FIXED_NODE_SQUARES,
  STARTING_PRESSURE,
  drawTableAmount,
} from "./nodes";

/** A ship on a depleted node, or in a bay, gained a point of power at the end of its side's turn (§8.6 step 1, §4.1, §3.1). */
export interface PowerGainedEffect {
  readonly type: "power-gained";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
}

/** A ship on a charged node lost a point of power at the end of its side's turn (§8.6 step 1, §4.1). */
export interface PowerLostEffect {
  readonly type: "power-lost";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
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
 * The side that just played paid energy for the depleted nodes it occupies
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

/** A charged node's drain reached its capacity and it went depleted (§8.6 step 3, §8.3). */
export interface NodeRanOutEffect {
  readonly type: "node-ran-out";
  readonly square: Square;
}

/** A depleted node finished recovering and went inactive, at pressure 1 (§8.6 step 6, §8.2). */
export interface NodeWentInactiveEffect {
  readonly type: "node-went-inactive";
  readonly square: Square;
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | PowerGainedEffect
  | PowerLostEffect
  | EnergyCollectedEffect
  | EnergyPenaltyEffect
  | NodeRanOutEffect
  | NodeChargedEffect
  | NodeWentInactiveEffect;

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
 * Step 6 must recover exactly the nodes that were depleted before this ply
 * began, never one that only goes depleted during this very sequence, in step
 * 3 below. The set is captured here, at entry, before step 3 runs — it is
 * exact because no action changes a node's state (rules.md §8.6), so the set
 * of depleted nodes when this function is entered is exactly the set from the
 * start of the ply.
 */
export function runEndOfTurn(state: GameState): EndOfTurnResult {
  const depletedBeforePly = depletedNodeNames(state);
  const side = state.sideToMove;
  const occupants = shipsBySquare(state);
  const effects: EndOfTurnEffect[] = [];

  // Step 1: the moving player's ships on charged nodes lose a point of
  // power, floored at 0, and those on depleted nodes or in a bay gain one,
  // capped at 4 (§4.1, §3.1). An inactive node does neither. A bay and a node
  // can never be the same square (§3.2), so the two gain conditions never
  // both apply. One pass over the fleet, so the effects come out in fleet
  // order with losses and gains interleaved exactly as the ships are
  // ordered.
  const ships = state.ships.map((ship) => {
    if (ship.side !== side) {
      return ship;
    }
    const nodeState = nodeStateAt(state, ship.square);
    if (nodeState === "charged" && ship.power > MIN_POWER) {
      const power = (ship.power - 1) as PowerLevel;
      effects.push({
        type: "power-lost",
        shipId: ship.id,
        side: ship.side,
        square: ship.square,
        power,
      });
      return { ...ship, power };
    }
    if (
      (nodeState === "depleted" || isBay(ship.square)) &&
      ship.power < MAX_POWER
    ) {
      const power = (ship.power + 1) as PowerLevel;
      effects.push({
        type: "power-gained",
        shipId: ship.id,
        side: ship.side,
        square: ship.square,
        power,
      });
      return { ...ship, power };
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

  // Step 2 (continued): the moving side then pays for the depleted nodes it
  // occupies right now (§8.4), taken from the total the collection above
  // has already raised. The table price is clamped to a count of five
  // depleted nodes; the amount actually taken is floored so the side's total
  // never goes below 0, and it is that floored amount — not the table
  // price — that is reported, so `newTotal` is always exactly
  // `previousTotal - amount`. A zero deduction is not an event, whether
  // because nothing depleted is occupied or because there is nothing left to
  // take: no effect, no other state change.
  const depletedSquares = depletedNodesOccupiedBy(workingState, side);
  const price = energyForDepletedNodes(depletedSquares.length);
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
      squares: depletedSquares,
    });
  }

  // Step 3: every charged node adds its drain — drawn from the held table if
  // a ship of either side is standing on it right now, the empty table
  // otherwise — and any that reaches capacity goes depleted carrying its
  // drain unclamped (§8.3). A ship left standing on it simply stays there,
  // collecting nothing (§8.5).
  for (const square of FIXED_NODE_SQUARES) {
    const name = squareName(square);
    const status = workingState.nodes[name];
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
    const nextStatus: NodeStatus =
      level < NODE_CAPACITY
        ? { state: "charged", level }
        : { state: "depleted", level };
    workingState = {
      ...workingState,
      nodes: { ...workingState.nodes, [name]: nextStatus },
      randomSeed: nextSeed,
    };

    if (nextStatus.state === "depleted") {
      effects.push({ type: "node-ran-out", square });
    }
  }

  // Step 4: as many inactive nodes as it takes to bring the board back to
  // five charged are charged, at random (§8.2, §8.6 step 4). Running short
  // is legal: with no inactive node left to draw from, this simply stops.
  const chargeDraw = runChargeDraw(workingState);
  workingState = chargeDraw.state;
  effects.push(...chargeDraw.effects);

  // Step 5: every node still inactive gains a point of pressure, to the cap
  // of 50 (§8.2). This runs after the charge draw, so a node is drawn at
  // the pressure it held all turn — its first appearance in a draw is at
  // weight 1, not 2 — and it runs before step 6, so a node that goes inactive
  // there starts at pressure 1 untouched by this step.
  for (const square of FIXED_NODE_SQUARES) {
    const name = squareName(square);
    const status = workingState.nodes[name];
    if (status === undefined || status.state !== "inactive") {
      continue;
    }
    if (status.level >= PRESSURE_CAP) {
      continue;
    }
    workingState = {
      ...workingState,
      nodes: {
        ...workingState.nodes,
        [name]: { state: "inactive", level: status.level + 1 },
      },
    };
  }

  // Step 6: every node that was depleted before this ply began (the
  // `depletedBeforePly` set captured at entry, above) subtracts its
  // recovery; any that reaches zero or below goes inactive, at pressure 1
  // (§8.2). A node that only went depleted during this very sequence — in
  // step 3 above — was charged when the ply began, so it is excluded and
  // first recovers at the end of the next ply.
  for (const square of FIXED_NODE_SQUARES) {
    const name = squareName(square);
    const status = workingState.nodes[name];
    if (
      status === undefined ||
      status.state !== "depleted" ||
      !depletedBeforePly.has(name)
    ) {
      continue;
    }
    const [drawnAmount, nextSeed] = drawTableAmount(
      workingState.randomSeed,
      DEPLETED_RECOVERY_TABLE,
    );
    const level = status.level - drawnAmount;
    const nextStatus: NodeStatus =
      level > 0
        ? { state: "depleted", level }
        : { state: "inactive", level: STARTING_PRESSURE };
    workingState = {
      ...workingState,
      nodes: { ...workingState.nodes, [name]: nextStatus },
      randomSeed: nextSeed,
    };

    if (nextStatus.state === "inactive") {
      effects.push({ type: "node-went-inactive", square });
    }
  }

  return { state: workingState, effects };
}
