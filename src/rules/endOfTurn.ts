// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Two ordering choices matter and both are
// deliberate (§8.6). Pressure (step 5) is gained after the charge draw
// (step 4), not before, so a node is drawn at the pressure it held all
// turn — its first appearance in a draw is at weight 1, never 2.
// Retiring a depleted node and replacing it (step 6) runs last, after both
// of those, deliberately: it is what makes a replacement spend at least one
// whole turn visibly inactive before the draw can pick it, rather than
// appearing -> charged inside a single sequence. And the two clocks are
// symmetric about the turn a state is entered: a node charged in step 4 of
// turn N first drains in step 3 of turn N+1, and a node that goes depleted
// in step 3 of turn N first retires (if it does) in step 6 of turn N+1 —
// which is why step 6 works from the depleted list captured at entry, before
// step 3 runs. A ship standing on a node that runs out in step 3 is trapped
// there (§7, §8.1, §8.5), and a ship trapped on a node that retires in step
// 6 is freed — both are reported as their own effect, immediately after the
// node event that caused them. Step 7, the relief, runs last of all,
// because it must see the depleted set exactly as it stands after both
// step 3's new arrivals and step 6's retirements — a node step 3 just
// depleted is a legitimate relief candidate, and a node step 6 already
// retired must not be reconsidered. It runs once for `state.sideToMove` —
// the side that just played — and then once for the other side, always in
// that fixed order, because it is the only step past this point that still
// draws from the seeded stream when it fires (rules.md §8.6 step 7); a
// data-dependent order would make a recorded game's replay depend on which
// side happened to need relief first.

import type { Square } from "./board";
import { squareName } from "./board";
import { isPlanet } from "./planets";
import { type NodeChargedEffect, runChargeDraw } from "./chargeDraw";
import { chargedNodesHeldBy, energyForNodesHeld } from "./energy";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type NodeStatus,
  type Ship,
  nodeSquares,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import { drawNodeSquare } from "./nodePlacement";
import { gainPower, MAX_POWER, type PowerLevel } from "./power";
import {
  DEPLETED_RECOVERY_TABLE,
  EMPTY_NODE_DRAIN_TABLE,
  HELD_NODE_DRAIN_TABLE,
  NODE_CAPACITY,
  PRESSURE_CAP,
  STARTING_PRESSURE,
  drawTableAmount,
} from "./nodes";
import { reliefSquare } from "./relief";

function otherSide(side: Side): Side {
  return side === "green" ? "red" : "green";
}

/**
 * A ship standing on a planet gained power at the end of its side's turn
 * (§8.6 step 1, §3.1, §4.1). `amount` is what actually landed after the
 * `MAX_POWER` cap, which may be less than the rate a lone charging ship
 * would otherwise draw.
 */
export interface PowerGainedEffect {
  readonly type: "power-gained";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
  readonly amount: number;
}

/** The side that just played collected energy for the charged nodes it holds (§8.6 step 2, §8.4). */
export interface EnergyCollectedEffect {
  readonly type: "energy-collected";
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

/**
 * A ship was standing on a node when it ran out and is now trapped there
 * (§7, §8.1, §8.5): it can neither move nor attack until the node retires.
 * Always immediately after the `node-ran-out` effect for the same node —
 * the node's event first, its consequence for the ship second.
 */
export interface ShipTrappedEffect {
  readonly type: "ship-trapped";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
}

/**
 * A depleted node's recovery reached zero and it retired, replaced at the
 * same instant by one new inactive node elsewhere, at pressure 1 (§8.6 step
 * 6, §8.2).
 */
export interface NodeReplacedEffect {
  readonly type: "node-replaced";
  readonly retiredSquare: Square;
  readonly newSquare: Square;
}

/**
 * A ship trapped on a node that just retired is free again: its square is
 * now an ordinary square (§8.5, §8.6 step 6). Always immediately after the
 * `node-replaced` effect for the same node, whether that node retired on
 * the ordinary recovery clock (step 6) or was ended early by the relief
 * (step 7) — it is the same fact either way.
 */
export interface ShipFreedEffect {
  readonly type: "ship-freed";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
}

/**
 * A side whose every ship was trapped had one of its depleted nodes ended
 * early, so it was not left to pass for the ten turns its recovery clock
 * would otherwise take (§8.6 step 7, §5). `side` is the side being
 * relieved, not necessarily the side that just played — step 7 asks the
 * question of both sides. Always immediately **before** the `node-replaced`
 * effect for the same node, so a listener hears the cause first, then the
 * map change, then the ship it freed.
 */
export interface NodeReliefEffect {
  readonly type: "node-relief";
  readonly side: Side;
  readonly square: Square;
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | PowerGainedEffect
  | EnergyCollectedEffect
  | NodeRanOutEffect
  | ShipTrappedEffect
  | NodeChargedEffect
  | NodeReplacedEffect
  | ShipFreedEffect
  | NodeReliefEffect;

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
 * Step 6 must retire exactly the nodes that were depleted before this ply
 * began, never one that only goes depleted during this very sequence, in step
 * 3 below. The ordered list is captured here, at entry, before step 3 runs —
 * it is exact because no action changes a node's state (rules.md §8.6), so
 * the set of depleted nodes when this function is entered is exactly the set
 * from the start of the ply. It is a snapshot, not a live walk, so that a
 * node written mid-sequence is never visited a second time, and so that a
 * replacement written by an earlier retirement in this same sequence is
 * visible to a later one's placement draw (§3.2, §8.2).
 */
export function runEndOfTurn(state: GameState): EndOfTurnResult {
  const depletedBeforePly = nodeSquares(state).filter(
    (square) => nodeStateAt(state, square) === "depleted",
  );
  const side = state.sideToMove;
  const occupants = shipsBySquare(state);
  const effects: EndOfTurnEffect[] = [];

  // Step 1: a ship standing on a planet at the end of its owner's turn
  // gains power (§3.1, §4.1) — the only thing that still changes a ship's
  // power here. A charged node no longer drains the ship holding it and a
  // depleted node no longer refills one; an inactive node still does
  // neither. The rate depends on how many of the moving side's ships are
  // charging — standing on a planet with room left to gain, i.e. below
  // `MAX_POWER` — and that count is taken once, from the fleet as it stood
  // when this step began, never recomputed mid-pass: a ship reaching the
  // maximum partway through must not change the rate for the ships still to
  // come. Exactly one charging ship gains 2, capped at `MAX_POWER`; two or
  // more each gain 1. One pass over the fleet, so the effects come out in
  // fleet order.
  const chargingCount = state.ships.filter(
    (candidate) =>
      candidate.side === side &&
      isPlanet(candidate.square) &&
      candidate.power < MAX_POWER,
  ).length;
  const chargeRate: 1 | 2 = chargingCount === 1 ? 2 : 1;
  const ships = state.ships.map((ship) => {
    if (
      ship.side !== side ||
      !isPlanet(ship.square) ||
      ship.power >= MAX_POWER
    ) {
      return ship;
    }
    const { power, amount } = gainPower(ship.power, chargeRate);
    effects.push({
      type: "power-gained",
      shipId: ship.id,
      side: ship.side,
      square: ship.square,
      power,
      amount,
    });
    return { ...ship, power };
  });
  let workingState: GameState = { ...state, ships };

  // Step 2: the moving side collects energy for the charged nodes it holds
  // right now (§8.4). Nothing is subtracted any more — a depleted node traps
  // the ship standing on it (§8.1, §8.5) rather than costing its owner
  // energy. A zero payout is not an event — no effect, no other state
  // change — so a player standing on nothing does not read as having had
  // something happen to them.
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
  // otherwise — and any that reaches capacity goes depleted carrying its
  // drain unclamped (§8.3). A ship left standing on it is trapped there
  // (§8.5): it cannot move and cannot attack until the node retires. The
  // `occupants` index was captured at this function's entry, before any node
  // changed state, so it is safe here for a ship's identity and square — a
  // ship never moves during this sequence — but must not be read for its
  // power, which step 1 above may have already changed. The ordered
  // snapshot of squares is taken once, up front, rather than recomputed on
  // every iteration.
  const step3Squares = nodeSquares(workingState);
  for (const square of step3Squares) {
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
      const trappedShip = occupants.get(name);
      if (trappedShip !== undefined) {
        effects.push({
          type: "ship-trapped",
          shipId: trappedShip.id,
          side: trappedShip.side,
          square,
        });
      }
    }
  }

  // Step 4: as many inactive nodes as it takes to bring the board back to
  // four charged are charged, at random (§8.2, §8.6 step 4). Running short
  // is legal: with no inactive node left to draw from, this simply stops.
  const chargeDraw = runChargeDraw(workingState);
  workingState = chargeDraw.state;
  effects.push(...chargeDraw.effects);

  // Step 5: every node still inactive gains a point of pressure, to the cap
  // of 50 (§8.2). This runs after the charge draw, so a node is drawn at
  // the pressure it held all turn — its first appearance in a draw is at
  // weight 1, not 2 — and it runs before step 6, so a node that goes inactive
  // there starts at pressure 1 untouched by this step. The ordered snapshot
  // is taken once, up front, rather than recomputed on every iteration.
  const step5Squares = nodeSquares(workingState);
  for (const square of step5Squares) {
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
  // `depletedBeforePly` list captured at entry, above) subtracts its
  // recovery; any that reaches zero or below retires and is replaced by one
  // new inactive node elsewhere, at pressure 1 (§8.2). A node that only went
  // depleted during this very sequence — in step 3 above — was charged when
  // the ply began, so it is excluded and first has a chance to retire at the
  // end of the next ply. The loop walks the entry snapshot, not a live walk
  // of the current board, and re-reads each square's current status,
  // skipping it if it is no longer depleted. Two retirements in the same
  // sequence are handled one after the other, each complete before the next
  // begins, so the second placement sees the first replacement and cannot
  // land adjacent to it.
  for (const square of depletedBeforePly) {
    const name = squareName(square);
    const status = workingState.nodes[name];
    if (status === undefined || status.state !== "depleted") {
      continue;
    }
    const [drawnAmount, nextSeed] = drawTableAmount(
      workingState.randomSeed,
      DEPLETED_RECOVERY_TABLE,
    );
    const level = status.level - drawnAmount;
    workingState = { ...workingState, randomSeed: nextSeed };

    if (level > 0) {
      workingState = {
        ...workingState,
        nodes: {
          ...workingState.nodes,
          [name]: { state: "depleted", level },
        },
      };
      continue;
    }

    const retirement = retireAndReplaceNode(workingState, square, occupants);
    workingState = retirement.state;
    effects.push(...retirement.effects);
  }

  // Step 7: the all-trapped relief (§8.6 step 7, §5). A side whose every
  // ship is trapped has no action at all, so rather than leaving it to pass
  // for the ten turns its recovery clock would otherwise take, the depleted
  // node with the least remaining life among those whose ship would
  // actually have a legal move once freed ends at once (`relief.ts`'s
  // choice). Runs for `side` — the one that just played — first, then for
  // the other side, always in that fixed order: it is the only step left
  // that draws from the seeded stream when it fires, and a
  // data-dependent order would make a recorded game's replay depend on
  // which side happened to need relief first. At most one node ends per
  // side per ply — freeing one ship is enough that the side is no longer
  // all-trapped — so the question is asked once per side, never in a loop.
  for (const reliefSide of [side, otherSide(side)]) {
    const square = reliefSquare(workingState, reliefSide);
    if (square === undefined) {
      continue;
    }
    effects.push({ type: "node-relief", side: reliefSide, square });
    const relief = retireAndReplaceNode(workingState, square, occupants);
    workingState = relief.state;
    effects.push(...relief.effects);
  }

  return { state: workingState, effects };
}

/**
 * Retires the node at `square` and replaces it elsewhere, at pressure 1
 * (§8.2, §8.6 step 6) — the body shared by an ordinary retirement (step 6,
 * a node whose recovery reached zero) and the relief's early ending (step
 * 7, §8.6). Emits `node-replaced`, then `ship-freed` if the retiring node
 * had a ship on it: the trap's release is the same fact either way. Not
 * exported — `relief.ts` needs only the choice of which node ends, never
 * this application of it, and exporting it would make `endOfTurn.ts` and
 * `relief.ts` import each other.
 *
 * `occupants` is the entry-time square-to-ship index; it is safe here for a
 * ship's identity and square, since a ship never moves during this
 * sequence, but must not be read for its power.
 */
function retireAndReplaceNode(
  state: GameState,
  square: Square,
  occupants: ReadonlyMap<string, Ship>,
): { state: GameState; effects: EndOfTurnEffect[] } {
  const name = squareName(square);
  const effects: EndOfTurnEffect[] = [];

  // The retiring node's entry is removed before the replacement pool is
  // built, so the adjacency constraint (§3.2) does not see it: the
  // replacement may legitimately land next to the square just vacated, and
  // only that square itself is barred, via `drawNodeSquare`'s
  // excluded-square argument. Only the current retiring square is barred
  // this way — a square freed by an earlier retirement in this same
  // sequence is not, since its entry is already gone from `state` and
  // nothing excludes it a second time, so a later replacement in the
  // sequence may land squarely on it.
  const nodesWithoutRetired = { ...state.nodes };
  delete nodesWithoutRetired[name];
  let workingState: GameState = { ...state, nodes: nodesWithoutRetired };

  const [newSquare, seedAfterDraw] = drawNodeSquare(
    nodeSquares(workingState),
    workingState.ships.map((ship) => ship.square),
    workingState.randomSeed,
    square,
  );
  const newName = squareName(newSquare);
  workingState = {
    ...workingState,
    nodes: {
      ...workingState.nodes,
      [newName]: { state: "inactive", level: STARTING_PRESSURE },
    },
    randomSeed: seedAfterDraw,
  };
  effects.push({
    type: "node-replaced",
    retiredSquare: square,
    newSquare,
  });

  const freedShip = occupants.get(name);
  if (freedShip !== undefined) {
    effects.push({
      type: "ship-freed",
      shipId: freedShip.id,
      side: freedShip.side,
      square,
    });
  }

  return { state: workingState, effects };
}
