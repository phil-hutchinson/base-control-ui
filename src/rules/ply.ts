// Applying an action, and the ply it belongs to (rules.md §5, §3.1, §7). An
// action is a move or an attack. A move is either refused, with the reason
// from movement.ts, or applied: the ship arrives, spends one action, and
// refills to full power if it ends in a bay. An attack is either refused,
// with the reason from combat.ts, or resolved: both ships are placed in
// bays drawn at random from the bays standing empty, attacker first,
// carrying the power each had before the fight, and both squares they left
// are left empty. There is no winner and no advance.
// Nothing a ship does changes a site's state: a site's state changes only in
// the end-of-turn sequence (rules.md §8.6). Every action — a move or an
// attack — marks the acting ship as having acted this ply, so a further
// attempt by the same ship this ply is refused. When the ply's actions are
// all spent, play passes to the other side. The pass guard covers the case
// §5 sets out for when the side to move has no legal action at all.

import { sideToMoveHasLegalAction } from "./actions";
import { isBay } from "./bays";
import { type Square, squareName } from "./board";
import {
  type AttackRefusalReason,
  attackRefusalReason,
  drawReturnBay,
} from "./combat";
import { type EndOfTurnEffect, runEndOfTurn } from "./endOfTurn";
import type { Side, ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  shipsBySquare,
} from "./gameState";
import { type MoveRefusalReason, moveRefusalReason } from "./movement";
import { MAX_POWER, type PowerLevel } from "./power";

function otherSide(side: Side): Side {
  return side === "green" ? "red" : "green";
}

/** The side to move passed because it had no legal move at all (rules.md §5). */
export interface PassEffect {
  readonly type: "ply-passed";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/** A ply ended because its last action was spent (rules.md §5, §8.6). */
export interface PlyEndedEffect {
  readonly type: "ply-ended";
  readonly side: Side;
  readonly sideToMove: Side;
  readonly endOfTurn: readonly EndOfTurnEffect[];
}

/**
 * The two effects that can close out an action, shared by every kind of
 * action rather than tied to moves specifically.
 */
export type EndOfActionEffect = PlyEndedEffect | PassEffect;

/** Something that happened as a result of applying a move, beyond the move itself. */
export type MoveEffect =
  { readonly type: "power-reset"; readonly shipId: ShipId } | EndOfActionEffect;

/** A move applied successfully, with the resulting state and what happened. */
export interface AppliedMove {
  readonly outcome: "applied";
  readonly state: GameState;
  readonly effects: readonly MoveEffect[];
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

/** One ship's journey back to a bay, from where it stood to where it landed. */
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
 * power each was carrying. `returns` lists both ships placed in a bay,
 * attacker first — every fight returns exactly two ships.
 */
export interface FightResolvedEffect {
  readonly type: "fight-resolved";
  readonly attacker: FightShip;
  readonly defender: FightShip;
  readonly returns: readonly FightReturn[];
}

/**
 * Something that happened as a result of applying an attack, beyond the
 * fight itself.
 */
export type AttackEffect = FightResolvedEffect | EndOfActionEffect;

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
 * If the side to move has no legal action at all — no legal move with any
 * eligible ship and no legal attack target with any ship — its ply passes:
 * the end-of-turn sequence runs for it (a passed ply is still a turn), the
 * acted-this-ply marks clear, the action count resets to
 * `ACTIONS_PER_PLY`, the ply number advances and the other side becomes the
 * side to move (rules.md §5, §8.6). Only the side to move is checked — the
 * side passed to is not — so this makes exactly one pass, never a second one
 * back.
 *
 * Once the game is over, every action is refused (rules.md §9), which is
 * exactly the condition this guard fires on. Checked first, ahead of
 * `sideToMoveHasLegalAction`, this returns the state untouched: otherwise the
 * guard would read "no legal action" as a pass, run the end-of-turn sequence
 * for a ply that does not exist, and advance past the end again on every
 * subsequent call, without bound.
 */
export function applyPassGuard(state: GameState): {
  readonly state: GameState;
  readonly effect: PassEffect | undefined;
} {
  if (isGameOver(state)) {
    return { state, effect: undefined };
  }

  if (sideToMoveHasLegalAction(state)) {
    return { state, effect: undefined };
  }

  const side = state.sideToMove;
  const sideToMove = otherSide(side);
  const endOfTurn = runEndOfTurn(state);
  const passedState: GameState = {
    ...endOfTurn.state,
    plyNumber: endOfTurn.state.plyNumber + 1,
    sideToMove,
    actionsRemaining: ACTIONS_PER_PLY,
    actedThisPly: [],
  };

  return {
    state: passedState,
    effect: {
      type: "ply-passed",
      side,
      sideToMove,
      endOfTurn: endOfTurn.effects,
    },
  };
}

/**
 * Runs the tail every action shares once its own effects have been applied:
 * spends one action; if that was the ply's last, runs the end-of-turn
 * sequence, advances the ply number, swaps the side to move and clears
 * `actedThisPly`, recording a `ply-ended` effect; then runs `applyPassGuard`,
 * recording a `ply-passed` effect if it fires. `actedShipId` is added to
 * `actedThisPly` — a move and an attack both spend the acting ship's one
 * action for the turn (rules.md §5), so every caller passes its own ship's
 * id. Mutates `effects` by appending whichever of the two end-of-action effects
 * fired, and returns the resulting state. `effects` is typed to accept
 * either caller's effect list, since both `MoveEffect` and `AttackEffect`
 * include `EndOfActionEffect` as one of their members.
 */
function applyEndOfActionTail(
  state: GameState,
  effects: (MoveEffect | AttackEffect)[],
  actedShipId: ShipId,
): GameState {
  const actionsRemaining = state.actionsRemaining - 1;
  let next: GameState;
  if (actionsRemaining > 0) {
    next = {
      ...state,
      actedThisPly: [...state.actedThisPly, actedShipId],
      actionsRemaining,
    };
  } else {
    const side = state.sideToMove;
    const sideToMove = otherSide(side);
    const endOfTurn = runEndOfTurn(state);
    next = {
      ...endOfTurn.state,
      plyNumber: endOfTurn.state.plyNumber + 1,
      sideToMove,
      actionsRemaining: ACTIONS_PER_PLY,
      actedThisPly: [],
    };
    effects.push({
      type: "ply-ended",
      side,
      sideToMove,
      endOfTurn: endOfTurn.effects,
    });
  }

  const { state: settled, effect: passEffect } = applyPassGuard(next);
  if (passEffect !== undefined) {
    effects.push(passEffect);
  }

  return settled;
}

/**
 * Applies a move of `shipId` to `destination` in `state`, or refuses it. A
 * legal move never mutates `state`: it returns a new state in which the ship
 * stands on `destination`, the square it left is empty, the ship is marked as
 * having acted this ply, one action is spent, and — per rules.md §3.1 — the
 * ship's power refills to full if `destination` is a bay. If the square the
 * ship left was a charged node, it stays charged — leaving a node does not
 * end it (rules.md §8.3). When the ply's last action is spent, play passes to
 * the other side and the acted-this-ply marks clear. The result then passes
 * through `applyPassGuard`, so a move that leaves the side now to move with
 * no legal move at all is followed immediately by a pass.
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

  const effects: MoveEffect[] = [];
  const endsInBay = isBay(destination);
  const movingShip = state.ships.find((ship) => ship.id === shipId);
  if (movingShip === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }

  const ships = state.ships.map((ship) =>
    ship.id === shipId
      ? {
          ...ship,
          square: destination,
          power: endsInBay ? MAX_POWER : ship.power,
        }
      : ship,
  );
  if (endsInBay && movingShip.power < MAX_POWER) {
    effects.push({ type: "power-reset", shipId });
  }

  const afterMove: GameState = { ...state, ships };
  const settled = applyEndOfActionTail(afterMove, effects, shipId);

  return { outcome: "applied", state: settled, effects };
}

/** Places `shipId` in `bay`, leaving its power exactly as it was (rules.md §7). */
function placeInBay(state: GameState, shipId: ShipId, bay: Square): GameState {
  return {
    ...state,
    ships: state.ships.map((ship) =>
      ship.id === shipId ? { ...ship, square: bay } : ship,
    ),
  };
}

/**
 * Checks the invariants rules.md §7 guarantees about a fight's result, and
 * throws if any is violated — bug detectors on a cheap operation, not cases a
 * caller need handle. `returnedShipIds` names the two ships placed in a bay.
 * Every other ship must be exactly where it was.
 *
 * The fleet-size check asserts each side's ship count is unchanged by the
 * fight, which can only ever change who holds a square, never how many
 * ships either side has.
 *
 * The site-state check is a plain identity comparison: no site's state or
 * `level` may differ between `before` and `after` at all. No action changes
 * a site's state, full stop — a site's state changes only in the end-of-turn
 * sequence (rules.md §8.6), never while an action is being resolved.
 *
 * The returned-ship checks pin what §7.1's random draw guarantees: each of
 * the two returned ships ends on a bay square, they do not share a bay, and
 * each lands in a bay that held no ship in `before` — together, exactly what
 * "there is always somewhere to go" promises. Each returned ship's power
 * must also be exactly what it was in `before`: a fight never changes what a
 * ship carries (rules.md §7).
 *
 * Exported so a test can hand-construct an otherwise-impossible before/after
 * pair, since it has no other seam.
 */
export function assertFightInvariants(
  before: GameState,
  after: GameState,
  returnedShipIds: ReadonlySet<ShipId>,
): void {
  const beforeOccupiedSquareNames = new Set(
    before.ships.map((ship) => squareName(ship.square)),
  );
  const returnedBaySquareNames = new Set<string>();

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
      if (!isBay(updated.square)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended on "${updatedName}", which is not a bay: rules.md §7.1 sends a returning ship to a bay`,
        );
      }
      if (returnedBaySquareNames.has(updatedName)) {
        throw new RangeError(
          `two returned ships both ended in bay "${updatedName}": rules.md §7.1 draws each returning ship its own empty bay`,
        );
      }
      returnedBaySquareNames.add(updatedName);
      if (beforeOccupiedSquareNames.has(updatedName)) {
        throw new RangeError(
          `returned ship "${ship.id}" ended in bay "${updatedName}", which held a ship before the fight: rules.md §7.1 draws only from bays empty at the moment`,
        );
      }
      if (updated.power !== ship.power) {
        throw new RangeError(
          `returned ship "${ship.id}" had ${ship.power} power before the fight and ${updated.power} after: rules.md §7 never changes what a ship carries`,
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

  const siteNames = new Set([
    ...Object.keys(before.siteStates),
    ...Object.keys(after.siteStates),
  ]);
  for (const name of siteNames) {
    const beforeStatus = before.siteStates[name];
    const afterStatus = after.siteStates[name];
    const unchanged =
      beforeStatus !== undefined &&
      afterStatus !== undefined &&
      beforeStatus.state === afterStatus.state &&
      beforeStatus.level === afterStatus.level;
    if (!unchanged) {
      throw new RangeError(
        `site "${name}" changed from "${beforeStatus?.state}" to "${afterStatus?.state}": no action changes a site's state, rules.md §8.6 says a site's state changes only in the end-of-turn sequence`,
      );
    }
  }
}

/**
 * Applies an attack by `shipId` on `target` in `state`, or refuses it
 * (rules.md §7). A legal attack never mutates `state`: both ships are placed,
 * carrying the power each had before the fight, in a bay drawn at random
 * from the bays standing empty (`drawReturnBay`), the attacker's bay drawn
 * first and the defender's from the bays still empty afterwards, advancing
 * `randomSeed` once per ship.
 * Both squares the ships fought from are left empty; there is no winner and
 * no advance. Neither square's site changes state: leaving a node does not
 * end it (rules.md §8.3). The attacking ship is added to `actedThisPly` even
 * though it ends the action in a bay itself: it spent its one action
 * regardless (rules.md §5). One action is spent; when the ply's last action
 * is spent, play passes to the other side exactly as it does after a move,
 * and the result then passes through `applyPassGuard`.
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

  const [attackerTo, seedAfterAttacker] = drawReturnBay(state);
  const afterAttackerReturned: GameState = {
    ...placeInBay(state, attackerShip.id, attackerTo),
    randomSeed: seedAfterAttacker,
  };
  const [defenderTo, seedAfterDefender] = drawReturnBay(afterAttackerReturned);
  const nextState: GameState = {
    ...placeInBay(afterAttackerReturned, defenderShip.id, defenderTo),
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
    new Set(returns.map((entry) => entry.shipId)),
  );

  const effects: AttackEffect[] = [
    {
      type: "fight-resolved",
      attacker: attackerBefore,
      defender: defenderBefore,
      returns,
    },
  ];

  const settled = applyEndOfActionTail(nextState, effects, attackerShip.id);

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
