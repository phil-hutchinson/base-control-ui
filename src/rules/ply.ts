// Applying an action, and the ply it belongs to (rules.md §5, §3.1, §7,
// §8.2). An action is a move or an attack. A move is either refused, with the
// reason from movement.ts, or applied: the ship arrives, spends one action,
// wakes any active site it touched on the way, and loses its shields if it
// ends in a bay. An attack is either refused, with the reason from
// combat.ts, or resolved: the winner (if any) keeps its shields minus the
// fight's cost, and the loser (or both, on a mutual return) is placed in a
// bay at 0 shields. A winning attacker then advances along the lane it
// attacked down, to the furthest square it may legally end on, waking any
// active site it touches along the way exactly as a move would; a winning
// defender never advances, and a mutual return leaves both squares empty.
// Every action — a move or an attack — marks the acting ship as having acted
// this ply, so a further attempt by the same ship this ply is refused.
// When the ply's actions are all spent, play passes to the other side. The
// pass guard covers the case §5 sets out for when the side to move has no
// legal action at all.

import { sideToMoveHasLegalAction } from "./actions";
import { isBay } from "./bays";
import { type Square, squareName } from "./board";
import {
  type AttackRefusalReason,
  attackReach,
  attackRefusalReason,
  drawReturnBay,
  resolveFight,
  winnerAdvance,
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

/** A ply ended because its last action was spent (rules.md §5, §8.7). */
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
 * winning ship, the shields it kept, the square it stands on once the fight
 * is over and whether it got there by advancing. Only an attacking winner can
 * advance (`advanced: true`); a winning defender's `square` is simply its own
 * and `advanced` is always `false`. `returns` lists every ship placed in a
 * bay — one entry for a decided fight, two (attacker first) for a mutual
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
    readonly square: Square;
    readonly advanced: boolean;
  };
  readonly returns: readonly FightReturn[];
}

/**
 * Something that happened as a result of applying an attack, beyond the
 * fight itself. `SiteChargedEffect` joins the union because a winning
 * attacker's advance can wake a node exactly as a move can (rules.md §8.2).
 */
export type AttackEffect =
  FightResolvedEffect | SiteChargedEffect | EndOfActionEffect;

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
 * side to move (rules.md §5, §8.7). Only the side to move is checked — the
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
 * ship's shields are reset to 0 if `destination` is a bay. When the ply's
 * last action is spent, play passes to the other side and the
 * acted-this-ply marks clear. The result then passes through
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
 * The advancing winner, for `assertFightInvariants` to check against: the
 * winning attacker's id, the attack lane it was judged against
 * (`laneSquareNames` — the attacker's own square, the attack's `passedOver`
 * and its `destination`, from the attack's `ReachEntry`), and the squares
 * the advance itself actually travelled (`travelledSquareNames` — its own
 * `passedOver` plus `destination`). Absent when the fight had no winner, the
 * winner was the defender, or the winner held its ground — in every one of
 * those cases the winner's square is asserted unchanged, like any other ship
 * that did not return to a bay.
 */
export interface AdvancingWinner {
  readonly shipId: ShipId;
  readonly laneSquareNames: ReadonlySet<string>;
  readonly travelledSquareNames: ReadonlySet<string>;
}

/**
 * Checks the invariants rules.md §7 guarantees about a fight's result, and
 * throws if any is violated — bug detectors on a cheap operation, not cases a
 * caller need handle. `returnedShipIds` names the ship or ships placed in a
 * bay; `advancingWinner`, when present, names the one further ship §7 allows
 * to change square: the attacking winner, travelling its own lane. Every
 * other ship must be exactly where it was.
 *
 * The fleet-size check asserts each side's ship count is unchanged by the
 * fight, which can only ever change who holds a square, never how many
 * ships either side has.
 *
 * The winner's final square is checked against `laneSquareNames` — the
 * attack it was judged against — not against `travelledSquareNames`, which
 * is the advance's own report of where it went: checking a value against
 * itself could never catch `winnerAdvance` returning a square that was never
 * on the lane the attack was legal down.
 *
 * The site-state check replaces a plain identity comparison with one that
 * still catches a fight that changes a site when nobody travelled (the
 * travelled set is empty whenever `advancingWinner` is absent): every site
 * whose state changed must be one the winner actually travelled over
 * (`travelledSquareNames`), and every such change must be `active` turning
 * `charged` — the only thing rules.md §8.2 ever does. This check is not
 * self-referential in the way the square check would be: it compares the
 * advance's path against `siteStates`, a wholly different piece of state.
 *
 * The returned-ship checks pin what §7.1's random draw guarantees: every
 * returned ship ends on a bay square, no two returned ships share a bay, and
 * each lands in a bay that held no ship in `before` — together, exactly what
 * "there is always somewhere to go" promises.
 *
 * Exported so a test can hand-construct an otherwise-impossible before/after
 * pair, since it has no other seam.
 */
export function assertFightInvariants(
  before: GameState,
  after: GameState,
  returnedShipIds: ReadonlySet<ShipId>,
  advancingWinner: AdvancingWinner | undefined,
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

    const isAdvancingWinner = advancingWinner?.shipId === ship.id;
    if (
      !returnedShipIds.has(ship.id) &&
      !isAdvancingWinner &&
      squareName(updated.square) !== squareName(ship.square)
    ) {
      throw new RangeError(
        `ship "${ship.id}" changed square in a fight it neither lost nor won as the attacker: rules.md §7 moves only a returning ship and an attacking winner`,
      );
    }

    if (isAdvancingWinner) {
      const updatedName = squareName(updated.square);
      if (!advancingWinner.laneSquareNames.has(updatedName)) {
        throw new RangeError(
          `winning attacker "${ship.id}" ended off its own lane: rules.md §7's advance only ever travels the lane it attacked down`,
        );
      }
      if (isBay(updated.square)) {
        throw new RangeError(
          `winning attacker "${ship.id}" ended in a bay: rules.md §3.1 and §3.2 guarantee an advance can never land in one`,
        );
      }
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

  const travelledSquareNames =
    advancingWinner?.travelledSquareNames ?? new Set<string>();
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
      beforeStatus.enteredOnPly === afterStatus.enteredOnPly;
    if (unchanged) {
      continue;
    }
    if (!travelledSquareNames.has(name)) {
      throw new RangeError(
        `site "${name}" changed state in a fight though no ship travelled over it: rules.md §8.2 only wakes a site a ship actually touches`,
      );
    }
    if (beforeStatus?.state !== "active" || afterStatus?.state !== "charged") {
      throw new RangeError(
        `site "${name}" changed from "${beforeStatus?.state}" to "${afterStatus?.state}" in a fight: rules.md §8.2 only ever turns an active site charged`,
      );
    }
  }
}

/**
 * Applies an attack by `shipId` on `target` in `state`, or refuses it
 * (rules.md §7). A legal attack never mutates `state`: the winner, if any,
 * keeps `winner − (loser + 1)` shields, and the loser (or both ships, on a
 * mutual return, attacker first) is placed at 0 shields in a bay drawn at
 * random from the bays standing empty (`drawReturnBay`), advancing
 * `randomSeed` once per returning ship. When the attacker wins, it then
 * advances along the lane it attacked down to the furthest square it may
 * legally end on (`winnerAdvance`), waking any active site the advance
 * touches exactly as `applyMove` would (rules.md §8.2); when there is no such
 * square it holds its ground. A winning defender never advances, and a
 * mutual return leaves both squares empty. The attacking ship is added to
 * `actedThisPly` in every outcome, including a mutual return in which it
 * ends the action in a bay itself: it spent its one action either way
 * (rules.md §5). One action is spent; when the ply's last action is spent,
 * play passes to the other side exactly as it does after a move, and the
 * result then passes through `applyPassGuard`.
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
  let siteChargedEffects: readonly SiteChargedEffect[] = [];
  let advancingWinner: AdvancingWinner | undefined;

  if (fightOutcome.result === "mutual-return") {
    const [attackerTo, seedAfterAttacker] = drawReturnBay(state);
    const afterAttackerReturned: GameState = {
      ...placeInBay(state, attackerShip.id, attackerTo),
      randomSeed: seedAfterAttacker,
    };
    const [defenderTo, seedAfterDefender] = drawReturnBay(
      afterAttackerReturned,
    );
    nextState = {
      ...placeInBay(afterAttackerReturned, defenderShip.id, defenderTo),
      randomSeed: seedAfterDefender,
    };
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

    const [loserTo, seedAfterLoser] = drawReturnBay(state);
    const withWinnerShields: GameState = {
      ...state,
      ships: state.ships.map((ship) =>
        ship.id === winnerShip.id
          ? { ...ship, shields: fightOutcome.winnerRemainingShields }
          : ship,
      ),
    };
    const afterLoserReturned: GameState = {
      ...placeInBay(withWinnerShields, loserShip.id, loserTo),
      randomSeed: seedAfterLoser,
    };

    let winnerSquare = winnerShip.square;
    let advanced = false;
    nextState = afterLoserReturned;

    if (winnerIsAttacker) {
      const reach = attackReach(state, attackerShip.id, target);
      if (reach === undefined) {
        throw new RangeError(
          `attacker "${attackerShip.id}" has no reach entry for a target attackRefusalReason already accepted`,
        );
      }

      const advance = winnerAdvance(afterLoserReturned, reach);
      if (advance !== undefined) {
        advanced = true;
        winnerSquare = advance.destination;

        const afterWinnerAdvanced: GameState = {
          ...afterLoserReturned,
          ships: afterLoserReturned.ships.map((ship) =>
            ship.id === winnerShip.id
              ? { ...ship, square: advance.destination }
              : ship,
          ),
        };
        const wake = wakeTouchedSites(afterWinnerAdvanced, winnerShip, advance);
        nextState = wake.state;
        siteChargedEffects = wake.effects;
        advancingWinner = {
          shipId: winnerShip.id,
          laneSquareNames: new Set(
            [attackerShip.square, ...reach.passedOver, reach.destination].map(
              squareName,
            ),
          ),
          travelledSquareNames: new Set(
            [...advance.passedOver, advance.destination].map(squareName),
          ),
        };
      }
    }

    winner = {
      shipId: winnerShip.id,
      remainingShields: fightOutcome.winnerRemainingShields,
      square: winnerSquare,
      advanced,
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
    advancingWinner,
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
    ...siteChargedEffects,
  ];

  const settled = applyEndOfActionTail(nextState, effects, attackerShip.id);

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
