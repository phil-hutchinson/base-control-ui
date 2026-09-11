// Applying a move or an attack, and the ply each one ends (rules.md §5, §3.1,
// §6, §7). Both spend the acting ship's power (§6): a move deducts its own
// cost, and an attack deducts the cost of the shape it struck down. A move is
// either refused, with the reason from movement.ts, or applied: the ship
// arrives with the power it had left after paying. A ship that ends a move on
// a planet recovers there at a point per turn (§3.1, §4.1), through the
// end-of-turn sequence — not on arrival. An attack is either refused, with
// the reason from combat.ts, or resolved: both ships are placed on planets
// drawn at random from the planets standing empty, attacker first; the
// attacker arrives having already paid the shot's cost, the defender carries
// what it had before the fight untouched, and both squares they left are
// left empty. There is no winner and no advance. An attack never changes a
// node's state — a node's state changes only in the end-of-turn sequence
// (rules.md §8.6) — but a move is the one knowing exception: leaving a
// charged node depletes it on the spot, as the move resolves, and stepping
// onto one with no countdown starts one (§8.3, `applyMove` below). A turn is
// one move or one attack (§5), so every move and every attack ends the ply:
// play always passes to the other side. The pass guard covers the case §5
// sets out for when the side to move can neither move nor attack at all.

import { sideToMoveCanMoveOrAttack } from "./canMoveOrAttack";
import { type Square, squareName } from "./board";
import { CHARGED_COUNTDOWN_PLIES, EXIT_COUNTDOWN_PLIES } from "./countdown";
import {
  type AttackRefusalReason,
  attackReach,
  attackRefusalReason,
  drawReturnPlanet,
} from "./combat";
import { isPlanet } from "./planets";
import { type EndOfTurnEffect, runEndOfTurn } from "./endOfTurn";
import type { Side, ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, type Ship, shipsBySquare } from "./gameState";
import {
  type MoveRefusalReason,
  findShip,
  moveRefusalReason,
  shapeReaching,
} from "./movement";
import { type PowerLevel, spendPower } from "./power";

function otherSide(side: Side): Side {
  return side === "green" ? "red" : "green";
}

/** Why the side to move's ply passed instead of moving or attacking (rules.md §5). */
export type PassReason = "cannot-move-or-attack" | "out-of-time";

/** The side to move's ply passed instead of a move or an attack being made (rules.md §5). */
export interface PassEffect {
  readonly type: "ply-passed";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly reason: PassReason;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/** A ply ended because a move or an attack was made (rules.md §5, §8.6). */
export interface PlyEndedEffect {
  readonly type: "ply-ended";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/**
 * The two effects that can close out a ply, shared by a move and an attack
 * alike rather than tied to either specifically.
 */
export type EndOfPlyEffect = PlyEndedEffect | PassEffect;

/**
 * A charged node depleted the instant its holder left it (rules.md §8.3):
 * the square the ship moved away from. Raised only by a move that leaves a
 * charged node, never by one that merely starts on an ordinary square or
 * arrives on one — leaving is what spends it, not the ship's presence
 * beforehand. Always the first effect a move carries, ahead of whichever
 * `EndOfPlyEffect` closes it out, so a listener hears the node spent
 * before hearing how the turn ended.
 */
export interface NodeSpentEffect {
  readonly type: "node-spent";
  readonly square: Square;
}

/** Something that happened as a result of applying a move, beyond the move itself. */
export type MoveEffect = NodeSpentEffect | EndOfPlyEffect;

/**
 * A move applied successfully, with the resulting state and what happened.
 * `cost` is the power the shape spent (rules.md §6) and `powerAfter` is the
 * moving ship's power once that cost is paid — an orthogonal step costs
 * nothing, so `powerAfter` then equals the power the ship carried before.
 */
export interface AppliedMove {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly MoveEffect[];
  readonly cost: PowerLevel;
  readonly powerAfter: PowerLevel;
}

/** A move that was not legal, carrying the reason (never a sentence). */
export interface RefusedMove {
  readonly outcome: "refused";
  readonly reason: MoveRefusalReason;
}

export type ApplyMoveResult = AppliedMove | RefusedMove;

/** One ship's identity, side, square and power level, as they stood before a fight. */
export interface FightShip {
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly power: PowerLevel;
}

/** One ship's journey back to a planet, from where it stood to where it landed. */
export interface FightReturn {
  readonly shipId: ShipId;
  readonly side: Side;
  readonly from: Square;
  readonly to: Square;
}

/**
 * A fight, resolved in full (rules.md §7): one effect for the whole fight
 * rather than several, since a fight is one fact. `attacker` and `defender`
 * describe both ships as they stood **before** the fight, including the
 * power each was carrying. `cost` is the power the attacking shape spent
 * (rules.md §6, §7): the attacker's power afterwards is `attacker.power`
 * less `cost`, and the defender's is `defender.power` untouched. `returns`
 * lists both ships placed on a planet, attacker first — every fight returns
 * exactly two ships.
 */
export interface FightResolvedEffect {
  readonly type: "fight-resolved";
  readonly attacker: FightShip;
  readonly defender: FightShip;
  readonly cost: PowerLevel;
  readonly returns: readonly FightReturn[];
}

/**
 * Something that happened as a result of applying an attack, beyond the
 * fight itself.
 */
export type AttackEffect = FightResolvedEffect | EndOfPlyEffect;

/** An attack applied successfully, with the resulting state and what happened. */
export interface AppliedAttack {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly AttackEffect[];
}

/** An attack that was not legal, carrying the reason (never a sentence). */
export interface RefusedAttack {
  readonly outcome: "refused";
  readonly reason: AttackRefusalReason;
}

export type ApplyAttackResult = AppliedAttack | RefusedAttack;

/**
 * Passes the side to move's ply for `reason`: the end-of-turn sequence runs
 * for it (a passed ply is still a turn), the ply number advances and the
 * other side becomes the side to move (rules.md §5, §8.6). Shared by
 * `applyPassGuard` and `applyOutOfTimePass`, which differ only in why the
 * pass happens.
 */
function passPly(
  state: GameState,
  reason: PassReason,
): { readonly state: GameState; readonly effect: PassEffect } {
  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state);
  const passedState: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
  };

  return {
    state: passedState,
    effect: {
      type: "ply-passed",
      side,
      sideToMove,
      reason,
      endOfTurn: endOfTurn.effects,
    },
  };
}

/**
 * If the side to move can neither move nor attack — no legal move with any
 * of its ships and no legal attack target with any of them — its ply passes
 * (rules.md §5, §8.6). Only the side to move is checked — the side passed to
 * is not — so this makes exactly one pass, never a second one back.
 *
 * Once the game is over, neither a move nor an attack is ever legal (rules.md
 * §9), which is exactly the condition this guard fires on. Checked first,
 * ahead of `sideToMoveCanMoveOrAttack`, this returns the state untouched:
 * otherwise the guard would read "cannot move or attack" as a pass, run the
 * end-of-turn sequence for a ply that does not exist, and advance past the
 * end again on every subsequent call, without bound.
 */
export function applyPassGuard(state: GameState): {
  readonly state: GameState;
  readonly effect: PassEffect | undefined;
} {
  if (isGameOver(state)) {
    return { state, effect: undefined };
  }

  if (sideToMoveCanMoveOrAttack(state)) {
    return { state, effect: undefined };
  }

  return passPly(state, "cannot-move-or-attack");
}

/**
 * The side to move passes because its clock has run out (rules.md §5, §10).
 * Refused — returning `state` untouched with no effects — unless the game is
 * not over **and** the side to move is genuinely out of time
 * (`state.outOfTime`). That refusal is deliberate and load-bearing: without
 * it, this would quietly become a pass button a player could use with time
 * still on the clock, which is out of scope.
 *
 * Otherwise the ply passes with reason "out of time", and the result is run
 * through `applyPassGuard` exactly as `applyMove` and `applyAttack` run their
 * own tail, so the side passed to never sits unable to move or attack. The
 * returned effects are therefore in order: the out-of-time pass, and — if the
 * guard fired — the cannot-move-or-attack pass that followed it.
 */
export function applyOutOfTimePass(state: GameState): {
  readonly state: GameState;
  readonly effects: readonly PassEffect[];
} {
  if (isGameOver(state) || !state.outOfTime[state.sideToMove]) {
    return { state, effects: [] };
  }

  const { state: passedState, effect } = passPly(state, "out-of-time");
  const effects: PassEffect[] = [effect];

  const { state: settled, effect: followingPass } = applyPassGuard(passedState);
  if (followingPass !== undefined) {
    effects.push(followingPass);
  }

  return { state: settled, effects };
}

/**
 * Runs the tail every move and every attack shares once its own effects have
 * been applied: a turn is one move or one attack (rules.md §5), so this
 * unconditionally runs the end-of-turn sequence, advances the ply number and
 * swaps the side to move, recording a `ply-ended` effect; then runs
 * `applyPassGuard`, recording a `ply-passed` effect if it fires. Mutates
 * `effects` by appending the `ply-ended` effect and whichever pass effect
 * follows it, and returns the resulting state. `effects` is typed to accept
 * either caller's effect list, since both `MoveEffect` and `AttackEffect`
 * include `EndOfPlyEffect` as one of their members.
 */
function endPly(
  state: GameState,
  effects: (MoveEffect | AttackEffect)[],
): GameState {
  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state);
  const next: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
  };
  effects.push({
    type: "ply-ended",
    side,
    sideToMove,
    endOfTurn: endOfTurn.effects,
  });

  const { state: settled, effect: passEffect } = applyPassGuard(next);
  if (passEffect !== undefined) {
    effects.push(passEffect);
  }

  return settled;
}

/**
 * Applies a move of `shipId` to `destination` in `state`, or refuses it. A
 * legal move never mutates `state`: it returns a new state in which the ship
 * stands on `destination` having paid the shape's cost (rules.md §6) out of
 * its own power. An orthogonal step costs nothing, so the ship's power is
 * untouched by it. A ship that ends the move on a planet does not gain
 * anything on arrival — it recovers a point at a time, through the
 * end-of-turn sequence (rules.md §3.1, §4.1), like any other planet stay.
 *
 * Two node changes happen as the move resolves — the one knowing exception
 * to a node's state changing only in the end-of-turn sequence (rules.md
 * §8.3, §8.6). If the square the ship left carries a charged node, it
 * depletes on the spot, carrying `EXIT_COUNTDOWN_PLIES`, and a
 * `NodeSpentEffect` is raised for it: leaving a node spends it, it is never
 * handed back, and the opponent cannot inherit it. If the square the ship
 * arrives on carries a charged node with no countdown, its countdown is set
 * to `CHARGED_COUNTDOWN_PLIES`; one that already carries a countdown is left
 * alone, which can only happen if this move somehow lands on an occupied
 * square, since a countdown's own holder is standing there.
 *
 * A move ends the ply (rules.md §5): play passes to the other side. The
 * result then passes through `applyPassGuard`, so a move that leaves the
 * side now to move with no legal move and no legal attack is followed
 * immediately by a pass.
 */
export function applyMove(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): ApplyMoveResult {
  const reason = moveRefusalReason(state, shipId, destination);
  if (reason !== undefined) {
    return { outcome: "refused", reason };
  }

  const ship = findShip(state, shipId);
  const shape = shapeReaching(ship.square, destination);
  if (shape === undefined) {
    throw new RangeError(
      `no shape reaches ${squareName(destination)} from ${squareName(ship.square)}, despite the move having been found legal`,
    );
  }
  const powerAfter = spendPower(ship.power, shape.cost);

  const effects: MoveEffect[] = [];

  const ships = state.ships.map((candidate) =>
    candidate.id === shipId
      ? { ...candidate, square: destination, power: powerAfter }
      : candidate,
  );

  const leftSquareName = squareName(ship.square);
  const destinationSquareName = squareName(destination);
  let nodes = state.nodes;

  const leftStatus = state.nodes[leftSquareName];
  if (leftStatus !== undefined && leftStatus.state === "charged") {
    nodes = {
      ...nodes,
      [leftSquareName]: { state: "depleted", level: EXIT_COUNTDOWN_PLIES },
    };
    effects.push({ type: "node-spent", square: ship.square });
  }

  const destinationStatus = state.nodes[destinationSquareName];
  if (
    destinationStatus !== undefined &&
    destinationStatus.state === "charged" &&
    destinationStatus.level === 0
  ) {
    nodes = {
      ...nodes,
      [destinationSquareName]: {
        state: "charged",
        level: CHARGED_COUNTDOWN_PLIES,
      },
    };
  }

  const afterMove: GameState = { ...state, ships, nodes };
  const settled = endPly(afterMove, effects);

  return {
    outcome: "applied",
    state: settled,
    effects,
    cost: shape.cost,
    powerAfter,
  };
}

/**
 * Places `shipId` on `planet`, carrying `power` (rules.md §7). The defender's
 * call passes its power unchanged; the attacker's call passes what is left
 * once the shot's cost is paid.
 */
function placeOnPlanet(
  state: GameState,
  shipId: ShipId,
  planet: Square,
  power: PowerLevel,
): GameState {
  return {
    ...state,
    ships: state.ships.map((ship) =>
      ship.id === shipId ? { ...ship, square: planet, power } : ship,
    ),
  };
}

/**
 * Checks the invariants rules.md §7 guarantees about a fight's result, and
 * throws if any is violated — bug detectors on a cheap operation, not cases a
 * caller need handle. `returnedShipIds` names the two ships placed on a
 * planet; `attackerShipId` names which of the two struck the blow, and
 * `cost` is what that shape spent (rules.md §6). Every other ship must be
 * exactly where it was.
 *
 * The fleet-size check asserts each side's ship count is unchanged by the
 * fight, which can only ever change who holds a square, never how many
 * ships either side has.
 *
 * The node-state check is a plain identity comparison: no node's state or
 * `level` may differ between `before` and `after` at all. An attack never
 * changes a node's state — a node's state changes only in the end-of-turn
 * sequence (rules.md §8.6), or in the middle of a **move** (§8.3, `applyMove`
 * above) — and neither combatant in a fight can be standing on a charged
 * node (§7 keeps a node's holder and a trapped ship out of combat in both
 * directions), so an attack cannot touch one either way.
 *
 * The returned-ship checks pin what §7.1's random draw guarantees: each of
 * the two returned ships ends on a planet, they do not share a planet, and
 * each lands on a planet that held no ship in `before` — together, exactly
 * what "there is always somewhere to go" promises. Power is checked
 * asymmetrically, since a fight no longer leaves both ships untouched: the
 * defender's power must be exactly what it was in `before`, and the
 * attacker's must be exactly `before`'s power less `cost` — the shape it
 * struck down (rules.md §6, §7).
 *
 * Exported so a test can hand-construct an otherwise-impossible before/after
 * pair, since it has no other seam.
 */
export function assertFightInvariants(
  before: GameState,
  after: GameState,
  attackerShipId: ShipId,
  cost: PowerLevel,
  returnedShipIds: ReadonlySet<ShipId>,
): void {
  const beforeOccupiedSquareNames = new Set(
    before.ships.map((ship) => squareName(ship.square)),
  );
  const returnedPlanetSquareNames = new Set<string>();

  for (const ship of before.ships) {
    const updated = after.ships.find((candidate) => candidate.id === ship.id);
    if (updated === undefined) {
      throw new RangeError(
        `ship "${ship.id}" is missing after a fight: rules.md §7 never removes a ship`,
      );
    }

    if (
      !returnedShipIds.has(ship.id) &&
      squareName(updated.square) !== squareName(ship.square)
    ) {
      throw new RangeError(
        `ship "${ship.id}" changed square in a fight it did not return from: rules.md §7 moves only a returning ship`,
      );
    }

    if (returnedShipIds.has(ship.id)) {
      const updatedName = squareName(updated.square);
      if (!isPlanet(updated.square)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended on "${updatedName}", which is not a planet: rules.md §7.1 sends a returning ship to a planet`,
        );
      }
      if (returnedPlanetSquareNames.has(updatedName)) {
        throw new RangeError(
          `two returned ships both ended on planet "${updatedName}": rules.md §7.1 draws each returning ship its own empty planet`,
        );
      }
      returnedPlanetSquareNames.add(updatedName);
      if (beforeOccupiedSquareNames.has(updatedName)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended on planet "${updatedName}", which held a ship before the fight: rules.md §7.1 draws only from planets empty at the moment`,
        );
      }
      const isAttacker = ship.id === attackerShipId;
      const expectedPower = isAttacker ? ship.power - cost : ship.power;
      if (updated.power !== expectedPower) {
        throw new RangeError(
          isAttacker
            ? `attacking ship "${ship.id}" had ${ship.power} power before the fight and paid ${cost} for the shot, so should have ended with ${expectedPower}, but ended with ${updated.power} instead: rules.md §6, §7 spend exactly the cost of the shape struck down`
            : `defending ship "${ship.id}" had ${ship.power} power before the fight and ${updated.power} after: rules.md §7 leaves the defender's power untouched`,
        );
      }
    }
  }

  for (const side of ["green", "red"] as const) {
    const beforeCount = before.ships.filter(
      (ship) => ship.side === side,
    ).length;
    const afterCount = after.ships.filter((ship) => ship.side === side).length;
    if (afterCount !== beforeCount) {
      throw new RangeError(
        `${side}'s fleet had ${beforeCount} ships before this fight and ${afterCount} after`,
      );
    }
  }

  const nodeNames = new Set([
    ...Object.keys(before.nodes),
    ...Object.keys(after.nodes),
  ]);
  for (const name of nodeNames) {
    const beforeStatus = before.nodes[name];
    const afterStatus = after.nodes[name];
    const unchanged =
      beforeStatus !== undefined &&
      afterStatus !== undefined &&
      beforeStatus.state === afterStatus.state &&
      beforeStatus.level === afterStatus.level;
    if (!unchanged) {
      throw new RangeError(
        `node "${name}" changed from "${beforeStatus?.state}" to "${afterStatus?.state}": an attack never changes a node's state, rules.md §8.6 says a node's state changes only in the end-of-turn sequence, or mid-move`,
      );
    }
  }
}

/**
 * Applies an attack by `shipId` on `target` in `state`, or refuses it
 * (rules.md §6, §7). A legal attack never mutates `state`: it deducts the
 * cost of the shape it struck down from the attacker's power as the fight
 * resolves, then places both ships on a planet drawn at random from the
 * planets standing empty (`drawReturnPlanet`) — the attacker arriving with
 * that power already spent, the defender carrying exactly what it had
 * before — the attacker's planet drawn first and the defender's from the
 * planets still empty afterwards, advancing `randomSeed` once per ship. Both
 * squares the ships fought from are left empty; there is no winner and no
 * advance. Neither square's node changes state: leaving a node does not end
 * it (rules.md §8.3). An attack ends the ply (rules.md §5), just as a move
 * does: play passes to the other side, and the result then passes through
 * `applyPassGuard`.
 */
export function applyAttack(
  state: GameState,
  shipId: ShipId,
  target: Square,
): ApplyAttackResult {
  const reason = attackRefusalReason(state, shipId, target);
  if (reason !== undefined) {
    return { outcome: "refused", reason };
  }

  const attackerShip = state.ships.find((ship) => ship.id === shipId);
  if (attackerShip === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  const defenderShip = shipsBySquare(state).get(squareName(target));
  if (defenderShip === undefined) {
    throw new RangeError(
      `no ship on the attacked square ${squareName(target)}`,
    );
  }

  const attackerBefore = toFightShip(attackerShip);
  const defenderBefore = toFightShip(defenderShip);

  const shape = attackReach(state, shipId, target);
  if (shape === undefined) {
    throw new RangeError(
      `no shape reaches ${squareName(target)} from ${squareName(attackerShip.square)}, despite the attack having been found legal`,
    );
  }
  const cost = shape.cost;
  const attackerPowerAfter = spendPower(attackerShip.power, cost);

  const [attackerTo, seedAfterAttacker] = drawReturnPlanet(state);
  const afterAttackerReturned: GameState = {
    ...placeOnPlanet(state, attackerShip.id, attackerTo, attackerPowerAfter),
    randomSeed: seedAfterAttacker,
  };
  const [defenderTo, seedAfterDefender] = drawReturnPlanet(
    afterAttackerReturned,
  );
  const nextState: GameState = {
    ...placeOnPlanet(
      afterAttackerReturned,
      defenderShip.id,
      defenderTo,
      defenderShip.power,
    ),
    randomSeed: seedAfterDefender,
  };
  const returns: FightReturn[] = [
    {
      shipId: attackerShip.id,
      side: attackerShip.side,
      from: attackerShip.square,
      to: attackerTo,
    },
    {
      shipId: defenderShip.id,
      side: defenderShip.side,
      from: defenderShip.square,
      to: defenderTo,
    },
  ];

  assertFightInvariants(
    state,
    nextState,
    attackerShip.id,
    cost,
    new Set(returns.map((entry) => entry.shipId)),
  );

  const effects: AttackEffect[] = [
    {
      type: "fight-resolved",
      attacker: attackerBefore,
      defender: defenderBefore,
      cost,
      returns,
    },
  ];

  const settled = endPly(nextState, effects);

  return { outcome: "applied", state: settled, effects };
}

/** A ship's identity, side, square and power level, snapshotted for a `FightResolvedEffect`. */
function toFightShip(ship: Ship): FightShip {
  return {
    shipId: ship.id,
    side: ship.side,
    square: ship.square,
    power: ship.power,
  };
}
