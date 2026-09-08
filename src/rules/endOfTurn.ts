// §8.6's end-of-turn sequence: the steps run once at the end of every ply,
// in the document's order. Reads `state.sideToMove` as the player who just
// moved and `state.plyNumber` as the ply just played, so `ply.ts` must call
// this before either changes. Two ordering choices matter and both are
// deliberate (§8.6). The queue's refill or rotation (step 5) runs after
// charging (step 4), not before, so the arrangement of priorities a player
// looks at while taking their turn is exactly the arrangement that governed
// the charge at the end of it (§8.2). Retirement (step 6) runs after both
// of those, deliberately: a node a refill places is inactive for the whole
// of the next turn and can first be charged at the end of it, never inside
// the same sequence that placed it.
//
// Step 3 spends one ply off every charged node that carries a countdown
// (rules.md §8.3). A node charging fresh out of the queue in step 4 carries
// none — it sits at baseline until a ship steps onto it (`ply.ts`'s
// `applyMove`) — so charging here never itself starts one. A node whose
// countdown reaches zero goes depleted, carrying `TRAP_COUNTDOWN_PLIES`, and
// traps the ship standing on it (§7, §8.1, §8.5). Step 6 spends one ply off
// every node that was *already* depleted when this sequence began — the
// `depletedBeforePly` snapshot captured at entry, below, before step 3 runs
// — and retires any that reaches zero. That snapshot is taken after the
// ply's own action has already resolved, which is why it is exact for both
// of a depleted node's two starting points: an exit node a ship left behind
// by walking off a charged node earlier in this very turn (`ply.ts`'s
// `applyMove`) *is* in it, so it spends its first ply at the end of this
// same turn (rules.md §8.3), while a trap step 3 creates below is *not* — it
// first spends a ply at the end of the next turn instead. Either way, a
// ship trapped on a node that runs out or retires is reported as its own
// effect, immediately after the node event that caused it. A retiring node
// is never replaced (§8.2): it simply leaves, and step 5's refill is the
// only thing that ever creates a new inactive node.
//
// Step 7, the relief, runs last of all, because it must see the depleted
// set exactly as it stands after both step 3's new arrivals and step 6's
// retirements — a node step 3 just depleted is a legitimate relief
// candidate, and a node step 6 already retired must not be reconsidered. It
// runs once for `state.sideToMove` — the side that just played — and then
// once for the other side, always in that fixed order, so a recorded
// game's replay never depends on which side happened to need relief first.
// Nothing in this whole sequence draws from the seeded stream any more
// except step 5's refill: a tie on remaining life can no longer arise
// (rules.md §8.3, §8.6 step 7), so the relief's choice is fully
// deterministic.

import type { Square } from "./board";
import { squareName } from "./board";
import { isPlanet } from "./planets";
import { type NodeChargedEffect, runCharging } from "./charging";
import { chargedNodesHeldBy } from "./energy";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type NodeStatus,
  type Ship,
  nodeSquares,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import {
  type InactiveNodeDraw,
  inactivePriority,
  refillQueue,
  rotatePriority,
} from "./nodeQueue";
import { gainPower, MAX_POWER, type PowerLevel } from "./power";
import { spendPly, TRAP_COUNTDOWN_PLIES } from "./countdown";
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

/** A charged node's countdown ran out and it went depleted (§8.6 step 3, §8.3). */
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
 * A depleted node's countdown ran out and it retired (§8.6 step 6, §8.2).
 * Nothing takes its place — a retiring node simply leaves the board.
 */
export interface NodeRetiredEffect {
  readonly type: "node-retired";
  readonly square: Square;
}

/**
 * A ship trapped on a node that just retired is free again: its square is
 * now an ordinary square (§8.5, §8.6 step 6). Always immediately after the
 * `node-retired` effect for the same node, whether that node retired on its
 * ordinary countdown (step 6) or was ended early by the relief (step 7) —
 * it is the same fact either way.
 */
export interface ShipFreedEffect {
  readonly type: "ship-freed";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
}

/**
 * A side whose every ship was trapped had one of its depleted nodes ended
 * early, so it was not left to pass for however many turns its countdown
 * would otherwise still take (§8.6 step 7, §5). `side` is the side being
 * relieved, not necessarily the side that just played — step 7 asks the
 * question of both sides. Always immediately **before** the `node-retired`
 * effect for the same node, so a listener hears the cause first, then the
 * map change, then the ship it freed.
 */
export interface NodeReliefEffect {
  readonly type: "node-relief";
  readonly side: Side;
  readonly square: Square;
}

/**
 * A charge swept the queue: whatever inactive nodes had not just charged
 * were discarded, in board order, and three new ones were drawn and dealt
 * priorities 1, 2 and 3 at random (§8.2, §8.6 step 5). One effect for the
 * whole sweep, rather than one per node, because the queue a player was
 * reading is gone and a new one has replaced it as a single event.
 */
export interface QueueRefilledEffect {
  readonly type: "queue-refilled";
  readonly discardedSquares: readonly Square[];
  readonly newNodes: readonly InactiveNodeDraw[];
}

/** Everything the end-of-turn sequence can report, in the order its steps run. */
export type EndOfTurnEffect =
  | PowerGainedEffect
  | EnergyCollectedEffect
  | NodeRanOutEffect
  | ShipTrappedEffect
  | NodeChargedEffect
  | QueueRefilledEffect
  | NodeRetiredEffect
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
 * sides or advancing the ply counter, and **after** the ply's own action has
 * already resolved (`ply.ts`).
 *
 * Step 6 must retire exactly the nodes that were depleted before this
 * sequence began, never one that only goes depleted during the sequence
 * itself, in step 3 below. The ordered list is captured here, at entry,
 * before step 3 runs. Because it is captured after the ply's action already
 * resolved, it correctly includes an exit node that action left behind by
 * walking a ship off a charged node (rules.md §8.3) — a knowing exception to
 * §8.6's rule that a node's state changes only in this sequence — so that
 * node spends its first ply at the end of this same turn, while a node step
 * 3 below depletes into a trap is excluded and first spends a ply at the end
 * of the next turn instead. It is a snapshot, not a live walk, so that a
 * node written mid-sequence is never visited a second time.
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

  // Step 2: the moving side collects one energy for each charged node it
  // holds right now (§8.4) — no table, no upper bound written here. Nothing
  // is subtracted any more — a depleted node traps the ship standing on it
  // (§8.1, §8.5) rather than costing its owner energy. A zero payout is not
  // an event — no effect, no other state change — so a player standing on
  // nothing does not read as having had something happen to them.
  const heldSquares = chargedNodesHeldBy(workingState, side);
  const amount = heldSquares.length;
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

  // Step 3: every charged node carrying a countdown (`level` above 0, per
  // `gameState.ts`'s `NodeStatus` doc comment) spends one ply of it (rules.md
  // §8.3); a node at 0 carries none and is untouched. One that reaches zero
  // goes depleted, carrying `TRAP_COUNTDOWN_PLIES`, and traps the ship
  // standing on it (§8.5): it cannot move and cannot attack until the node
  // retires. The `occupants` index was captured at this function's entry,
  // before any node changed state, so it is safe here for a ship's identity
  // and square — a ship never moves during this sequence — but must not be
  // read for its power, which step 1 above may have already changed. The
  // ordered snapshot of squares is taken once, up front, rather than
  // recomputed on every iteration. Nothing here draws from the seed.
  const step3Squares = nodeSquares(workingState);
  for (const square of step3Squares) {
    const name = squareName(square);
    const status = workingState.nodes[name];
    if (
      status === undefined ||
      status.state !== "charged" ||
      status.level <= 0
    ) {
      continue;
    }
    const remaining = spendPly(status.level);
    const nextStatus: NodeStatus =
      remaining > 0
        ? { state: "charged", level: remaining }
        : { state: "depleted", level: TRAP_COUNTDOWN_PLIES };
    workingState = {
      ...workingState,
      nodes: { ...workingState.nodes, [name]: nextStatus },
    };

    if (nextStatus.state === "depleted") {
      effects.push({ type: "node-ran-out", square });
      // A charged node only ever carries a countdown while a ship holds it,
      // so `trappedShip` is always defined here in play — a countdown ends
      // the instant its holder leaves. The `undefined` branch cannot occur;
      // `TRAP_COUNTDOWN_PLIES` above is deposited regardless, and its choice
      // there is arbitrary rather than derived from ship presence.
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

  // Step 4: the shortfall against four charged is filled from the three
  // inactive nodes, top-down by priority (§8.2, §8.6 step 4) — no draw, no
  // weighting, no seed movement. The shortfall never exceeds two (§8.3), so
  // the three-node queue always covers it.
  const charging = runCharging(workingState);
  workingState = charging.state;
  effects.push(...charging.effects);

  // Step 5: refill or rotate (§8.2, §8.6 step 5). If step 4 charged
  // anything, the queue is swept: whichever inactive nodes did not charge
  // are discarded, and three new ones are drawn by one refill, spread apart
  // from the charged nodes and from each other and dealt priorities 1, 2
  // and 3 at random — reported as one `queue-refilled` effect. Otherwise
  // nothing charged, so every surviving inactive node's priority rotates
  // one step (1→2, 2→3, 3→1), silently and without moving the seed at all
  // — a freshly refilled trio is never rotated in the turn it was dealt.
  if (charging.effects.length > 0) {
    const discardedSquares = nodeSquares(workingState).filter(
      (square) => nodeStateAt(workingState, square) === "inactive",
    );
    const nodesWithoutInactive = { ...workingState.nodes };
    for (const square of discardedSquares) {
      delete nodesWithoutInactive[squareName(square)];
    }
    const chargedSquares = nodeSquares(workingState).filter(
      (square) => nodeStateAt(workingState, square) === "charged",
    );
    const [newNodes, seedAfterRefill] = refillQueue(
      nodeSquares({ ...workingState, nodes: nodesWithoutInactive }),
      chargedSquares,
      workingState.ships.map((ship) => ship.square),
      workingState.randomSeed,
    );
    const refilledNodes = { ...nodesWithoutInactive };
    for (const { square, priority } of newNodes) {
      refilledNodes[squareName(square)] = {
        state: "inactive",
        level: priority,
      };
    }
    workingState = {
      ...workingState,
      nodes: refilledNodes,
      randomSeed: seedAfterRefill,
    };
    effects.push({ type: "queue-refilled", discardedSquares, newNodes });
  } else {
    const survivingInactiveSquares = nodeSquares(workingState);
    for (const square of survivingInactiveSquares) {
      const name = squareName(square);
      const status = workingState.nodes[name];
      if (status === undefined || status.state !== "inactive") {
        continue;
      }
      workingState = {
        ...workingState,
        nodes: {
          ...workingState.nodes,
          [name]: {
            state: "inactive",
            level: rotatePriority(inactivePriority(status)),
          },
        },
      };
    }
  }

  // Step 6: every node that was depleted before this ply began (the
  // `depletedBeforePly` list captured at entry, above) spends one ply of its
  // countdown; any that reaches zero retires and simply leaves the board —
  // nothing appears in its place (§8.2). A node that only went depleted
  // during this very sequence — in step 3 above — carried a charged
  // countdown (or none) when the ply began, so it is excluded and first
  // spends a ply at the end of the next ply. The loop walks the entry
  // snapshot, not a live walk of the current board, and re-reads each
  // square's current status, skipping it if it is no longer depleted.
  // Nothing here draws from the seed.
  for (const square of depletedBeforePly) {
    const name = squareName(square);
    const status = workingState.nodes[name];
    if (status === undefined || status.state !== "depleted") {
      continue;
    }
    const level = spendPly(status.level);

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

    const retirement = retireNode(workingState, square, occupants);
    workingState = retirement.state;
    effects.push(...retirement.effects);
  }

  // Step 7: the all-trapped relief (§8.6 step 7, §5). A side whose every
  // ship is trapped has no action at all, so rather than leaving it to pass
  // for however many turns its trap countdown would otherwise still take,
  // the depleted node with the least remaining life among those whose ship
  // would actually have a legal move once freed ends at once (`relief.ts`'s
  // choice); on a tie, the first candidate in board order — a tie can no
  // longer arise (§8.3), so this is a deterministic tidy-up of an
  // unreachable case, not a rule. Runs for `side` — the one that just
  // played — first, then for the other side, always in that fixed order, so
  // a recorded game's replay never depends on which side happened to need
  // relief first. At most one node ends per side per ply — freeing one ship
  // is enough that the side is no longer all-trapped — so the question is
  // asked once per side, never in a loop.
  for (const reliefSide of [side, otherSide(side)]) {
    const square = reliefSquare(workingState, reliefSide);
    if (square === undefined) {
      continue;
    }
    effects.push({ type: "node-relief", side: reliefSide, square });
    const relief = retireNode(workingState, square, occupants);
    workingState = relief.state;
    effects.push(...relief.effects);
  }

  return { state: workingState, effects };
}

/**
 * Retires the node at `square` (§8.2, §8.6 step 6) — the body shared by an
 * ordinary retirement (step 6, a node whose countdown ran out) and the
 * relief's early ending (step 7, §8.6). It removes the node's entry and
 * places nothing in its stead: a retiring node simply leaves the board.
 * Emits `node-retired`, then `ship-freed` if the retiring node had a ship
 * on it: the trap's release is the same fact either way. Not exported —
 * `relief.ts` needs only the choice of which node ends, never this
 * application of it, and exporting it would make `endOfTurn.ts` and
 * `relief.ts` import each other.
 *
 * `occupants` is the entry-time square-to-ship index; it is safe here for a
 * ship's identity and square, since a ship never moves during this
 * sequence, but must not be read for its power.
 */
function retireNode(
  state: GameState,
  square: Square,
  occupants: ReadonlyMap<string, Ship>,
): { state: GameState; effects: EndOfTurnEffect[] } {
  const name = squareName(square);
  const effects: EndOfTurnEffect[] = [];

  const nodesWithoutRetired = { ...state.nodes };
  delete nodesWithoutRetired[name];
  const workingState: GameState = { ...state, nodes: nodesWithoutRetired };

  effects.push({ type: "node-retired", square });

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
