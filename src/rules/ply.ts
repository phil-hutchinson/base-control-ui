// Applying an action, and the ply it belongs to (rules.md §5, §3.1, §7,
// §8.2). An action is a move or an attack. A move is either refused, with the
// reason from movement.ts, or applied: the ship arrives, is marked as having
// moved, spends one action, wakes any active site it touched on the way, and
// loses its shields if it ends in a bay. An attack is either refused, with
// the reason from combat.ts, or resolved: neither ship changes square, the
// winner (if any) keeps its shields minus the fight's cost, and the loser (or
// both, on a mutual return) is placed in a bay at 0 shields — never marked as
// having moved, since only a move counts towards that. When the ply's two
// actions are spent, play passes to the other side. The pass guard covers the
// case §5 sets out for when the side to move has no legal action at all.

import { sideToMoveHasLegalAction } from "./actions";
import { isBay } from "./bays";
import { type Square, squareName } from "./board";
import {
  type AttackRefusalReason,
  attackRefusalReason,
  receptacleBay,
  resolveFight,
} from "./combat";
import { type EndOfTurnEffect, runEndOfTurn } from "./endOfTurn";
import type { Side, ShipId } from "./fleet";
import {
  ACTIONS_PER_PLY,
  type GameState,
  type Ship,
  shipsBySquare,
} from "./gameState";
import {
  type MoveRefusalReason,
  moveRefusalReason,
  reachFrom,
} from "./movement";
import { type SiteChargedEffect, wakeTouchedSites } from "./nodes";
import type { ShieldCount } from "./shields";

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

/** A ply ended because its second action was spent (rules.md §5, §8.7). */
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
  | { readonly type: "shields-reset"; readonly shipId: ShipId }
  | SiteChargedEffect
  | EndOfActionEffect;

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

/** One ship's identity, side, square and shield count, as they stood before a fight. */
export interface FightShip {
  readonly shipId: ShipId;
  readonly side: Side;
  readonly square: Square;
  readonly shields: ShieldCount;
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
 * describe both ships as they stood **before** the fight; `winner` is present
 * only when the fight was decided (absent on a mutual return), naming the
 * winning ship and the shields it kept; `returns` lists every ship placed in
 * a bay — one entry for a decided fight, two (attacker first) for a mutual
 * return.
 */
export interface FightResolvedEffect {
  readonly type: "fight-resolved";
  readonly outcome: "attacker-won" | "defender-won" | "mutual-return";
  readonly attacker: FightShip;
  readonly defender: FightShip;
  readonly winner?: {
    readonly shipId: ShipId;
    readonly remainingShields: ShieldCount;
  };
  readonly returns: readonly FightReturn[];
}

/** Something that happened as a result of applying an attack, beyond the fight itself. */
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
 * moved-this-ply marks clear, the action count resets to
 * `ACTIONS_PER_PLY`, the ply number advances and the other side becomes the
 * side to move (rules.md §5, §8.7). Only the side to move is checked — the
 * side passed to is not — so this makes exactly one pass, never a second one
 * back.
 */
export function applyPassGuard(state: GameState): {
  readonly state: GameState;
  readonly effect: PassEffect | undefined;
} {
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
    movedThisPly: [],
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
 * spends one action; if that was the ply's second, runs the end-of-turn
 * sequence, advances the ply number, swaps the side to move and clears
 * `movedThisPly`, recording a `ply-ended` effect; then runs `applyPassGuard`,
 * recording a `ply-passed` effect if it fires. `movedShipId` is added to
 * `movedThisPly` when given, and omitted for an action — an attack, in
 * particular — that does not count as a move (rules.md §5). Mutates
 * `effects` by appending whichever of the two end-of-action effects fired,
 * and returns the resulting state. `effects` is typed to accept either
 * caller's effect list, since both `MoveEffect` and `AttackEffect` include
 * `EndOfActionEffect` as one of their members.
 */
function applyEndOfActionTail(
  state: GameState,
  effects: (MoveEffect | AttackEffect)[],
  movedShipId?: ShipId,
): GameState {
  const actionsRemaining = state.actionsRemaining - 1;
  let next: GameState;
  if (actionsRemaining > 0) {
    next = {
      ...state,
      movedThisPly:
        movedShipId === undefined
          ? state.movedThisPly
          : [...state.movedThisPly, movedShipId],
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
      movedThisPly: [],
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
 * having moved this ply, one action is spent, and — per rules.md §3.1 — the
 * ship's shields are reset to 0 if `destination` is a bay. When the ply's
 * second action is spent, play passes to the other side and the
 * moved-this-ply marks clear. The result then passes through
 * `applyPassGuard`, so a move that leaves the side now to move with no legal
 * move at all is followed immediately by a pass.
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
  const destinationName = squareName(destination);
  const path = reachFrom(movingShip.square, movingShip.shields).find(
    (entry) => squareName(entry.destination) === destinationName,
  );
  if (path === undefined) {
    throw new RangeError(
      `no reach entry for ship "${shipId}" to a legal destination`,
    );
  }

  const ships = state.ships.map((ship) =>
    ship.id === shipId
      ? {
          ...ship,
          square: destination,
          shields: endsInBay ? 0 : ship.shields,
        }
      : ship,
  );
  if (endsInBay && movingShip.shields > 0) {
    effects.push({ type: "shields-reset", shipId });
  }

  const afterMove: GameState = { ...state, ships };
  const wake = wakeTouchedSites(afterMove, movingShip, path);
  effects.push(...wake.effects);

  const settled = applyEndOfActionTail(wake.state, effects, shipId);

  return { outcome: "applied", state: settled, effects };
}

/** Places `shipId` in `bay`, resetting its shields to 0 (rules.md §7.1, §3.1). */
function placeInBay(state: GameState, shipId: ShipId, bay: Square): GameState {
  return {
    ...state,
    ships: state.ships.map((ship) =>
      ship.id === shipId ? { ...ship, square: bay, shields: 0 } : ship,
    ),
  };
}

/**
 * Checks the invariants rules.md §7 guarantees about a fight's result, and
 * throws if any is violated — bug detectors on a cheap operation, not cases a
 * caller need handle. `returnedShipIds` names the ship or ships placed in a
 * bay; every other ship, including a winner, must be exactly where it was.
 *
 * The fleet-size check asserts each side's ship count is unchanged by the
 * fight, which can only ever change who holds a square, never how many
 * ships either side has.
 */
function assertFightInvariants(
  before: GameState,
  after: GameState,
  returnedShipIds: ReadonlySet<ShipId>,
): void {
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
        `ship "${ship.id}" changed square in a fight it did not lose: rules.md §7 says neither ship moves`,
      );
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

  if (after.siteStates !== before.siteStates) {
    throw new RangeError(
      "a fight changed a site's state: rules.md §7 says nobody moves in a fight, so §8.2 never fires",
    );
  }
}

/**
 * Applies an attack by `shipId` on `target` in `state`, or refuses it
 * (rules.md §7). A legal attack never mutates `state`: neither ship changes
 * square — the winner, if any, simply keeps `winner − (loser + 1)` shields,
 * and the loser (or both ships, on a mutual return, attacker first) is placed
 * in a bay at 0 shields. The attacking ship is **not** added to
 * `movedThisPly`: only a move counts towards that (rules.md §5). One action
 * is spent; when the ply's second action is spent, play passes to the other
 * side exactly as it does after a move, and the result then passes through
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

  const fightOutcome = resolveFight(attackerShip.shields, defenderShip.shields);

  let nextState: GameState;
  let winner: FightResolvedEffect["winner"];
  let returns: FightReturn[];

  if (fightOutcome.result === "mutual-return") {
    const attackerTo = receptacleBay(state);
    const afterAttackerReturned = placeInBay(
      state,
      attackerShip.id,
      attackerTo,
    );
    const defenderTo = receptacleBay(afterAttackerReturned);
    nextState = placeInBay(afterAttackerReturned, defenderShip.id, defenderTo);
    winner = undefined;
    returns = [
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
  } else {
    const winnerIsAttacker = fightOutcome.result === "attacker-won";
    const winnerShip = winnerIsAttacker ? attackerShip : defenderShip;
    const loserShip = winnerIsAttacker ? defenderShip : attackerShip;

    const loserTo = receptacleBay(state);
    const withWinnerShields: GameState = {
      ...state,
      ships: state.ships.map((ship) =>
        ship.id === winnerShip.id
          ? { ...ship, shields: fightOutcome.winnerRemainingShields }
          : ship,
      ),
    };
    nextState = placeInBay(withWinnerShields, loserShip.id, loserTo);
    winner = {
      shipId: winnerShip.id,
      remainingShields: fightOutcome.winnerRemainingShields,
    };
    returns = [
      {
        shipId: loserShip.id,
        side: loserShip.side,
        from: loserShip.square,
        to: loserTo,
      },
    ];
  }

  assertFightInvariants(
    state,
    nextState,
    new Set(returns.map((entry) => entry.shipId)),
  );

  const effects: AttackEffect[] = [
    {
      type: "fight-resolved",
      outcome: fightOutcome.result,
      attacker: attackerBefore,
      defender: defenderBefore,
      winner,
      returns,
    },
  ];

  const settled = applyEndOfActionTail(nextState, effects);

  return { outcome: "applied", state: settled, effects };
}

/** A ship's identity, side, square and shield count, snapshotted for a `FightResolvedEffect`. */
function toFightShip(ship: Ship): FightShip {
  return {
    shipId: ship.id,
    side: ship.side,
    square: ship.square,
    shields: ship.shields,
  };
}
