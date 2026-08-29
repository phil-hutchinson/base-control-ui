// Combat (rules.md §7, §3.1): who may attack whom, and where a winning
// attacker ends up. This is the only implementation of §7 in the app, the way
// `movement.ts` is the only implementation of §6. Attack range **is** §6's
// movement range: a ship attacks exactly as far as it moves, path and all, so
// `attackReach` reads `reachFrom` (rules.md §6) rather than carrying a second
// copy of the table. There is one implementation of the table, and both
// sections read it. `winnerAdvance` walks that same lane backwards from the
// loser's square to find where the winner may legally come to rest.

import { type Square, squareName } from "./board";
import { BAYS, isBay } from "./bays";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type ReachEntry, findShip, reachFrom } from "./moveLegality";
import { type GameState, shipsBySquare } from "./gameState";
import { drawIndex } from "./random";
import { type ShieldCount, isShieldCount } from "./shields";

/**
 * The lane `shipId` would attack down to reach `target`: the `ReachEntry`
 * from `reachFrom(attacker.square, attacker.shields)` whose `destination` is
 * `target`, or `undefined` when `target` is outside the attacker's reach
 * altogether. Purely geometric — no ownership, no bays, no occupancy, no
 * awareness of whose ply it is — so both the legality check below and
 * `winnerAdvance` share one answer to "what lane is this".
 */
export function attackReach(
  state: GameState,
  shipId: ShipId,
  target: Square,
): ReachEntry | undefined {
  const attacker = findShip(state, shipId);
  const targetName = squareName(target);

  return reachFrom(attacker.square, attacker.shields).find(
    (entry) => squareName(entry.destination) === targetName,
  );
}

/**
 * Where a winning attacker ends up (rules.md §7): scanning `reach`'s lane
 * backwards from the loser's square towards the attacker, the furthest
 * square it may legally end on — §6's restriction, which is occupancy alone.
 * Shaped as the sub-lane the winner actually travels (`destination` is the
 * square it stops on, `passedOver` the lane squares before it). `undefined`
 * when no square on the lane qualifies, meaning the winner holds its ground.
 *
 * `reach` is the attack's own `ReachEntry`, exactly as `attackReach` found
 * it. Occupancy is re-checked here even though the lane was clear when the
 * attack was judged, because the loser's return may have placed it on a bay
 * that sits on that same lane; a candidate the winner cannot reach without
 * crossing an occupied square is skipped, as is an occupied candidate itself.
 */
export function winnerAdvance(
  state: GameState,
  reach: ReachEntry,
): ReachEntry | undefined {
  const lane = [...reach.passedOver, reach.destination];
  const occupiedSquareNames = shipsBySquare(state);

  for (let index = lane.length - 1; index >= 0; index--) {
    const candidate = lane[index];
    if (occupiedSquareNames.has(squareName(candidate))) {
      continue;
    }
    if (
      lane
        .slice(0, index)
        .some((square) => occupiedSquareNames.has(squareName(square)))
    ) {
      continue;
    }
    return { destination: candidate, passedOver: lane.slice(0, index) };
  }

  return undefined;
}

/**
 * The structured reasons a square is not a legal attack target for a ship.
 * Never a sentence — the wording for these lives in `src/board/`.
 *
 * `"no-target-there"` and `"target-is-friendly"` are never produced by the
 * session, which treats activating an empty or friendly square as a move
 * attempt rather than a failed attack; they exist so this function stays
 * total over every square.
 */
export type AttackRefusalReason =
  | "not-your-ship"
  | "ship-already-acted"
  | "attacker-in-bay"
  | "target-in-bay"
  | "no-target-there"
  | "target-is-friendly"
  | "target-out-of-range"
  | "attack-path-blocked"
  | "game-over";

/**
 * Why `target` is not a legal attack for `shipId` in the given state, under
 * §7 and §3.1 alone, with no awareness of whether the game has ended. This
 * layer exists so the §5 pass guard can ask "is any action legal here"
 * without that question answering itself, exactly as
 * `sixOnlyMoveRefusalReason` does for §6.
 *
 * Checked most fundamental first: whose ship it is, then whether it has
 * already acted, then the attacker's own bay, then everything about the
 * target — no ship there, a friendly ship, a ship in a bay — and only then
 * range and path, which come last so a bay target within reach is still
 * refused as `"target-in-bay"` rather than as an out-of-range square.
 */
export function sevenOnlyAttackRefusalReason(
  state: GameState,
  shipId: ShipId,
  target: Square,
): AttackRefusalReason | undefined {
  const attacker = findShip(state, shipId);

  if (attacker.side !== state.sideToMove) {
    return "not-your-ship";
  }
  if (state.actedThisPly.includes(shipId)) {
    return "ship-already-acted";
  }
  if (isBay(attacker.square)) {
    return "attacker-in-bay";
  }

  const targetShip = shipsBySquare(state).get(squareName(target));
  if (targetShip === undefined) {
    return "no-target-there";
  }
  if (targetShip.side === attacker.side) {
    return "target-is-friendly";
  }
  if (isBay(target)) {
    return "target-in-bay";
  }

  const reach = attackReach(state, shipId, target);
  if (reach === undefined) {
    return "target-out-of-range";
  }

  const occupied = shipsBySquare(state);
  if (reach.passedOver.some((square) => occupied.has(squareName(square)))) {
    return "attack-path-blocked";
  }

  return undefined;
}

/**
 * Every square `shipId` may legally attack in the given state, under §7 and
 * §3.1 alone, with no awareness of whether the game has ended. The §7-only
 * counterpart to the public `legalTargets`.
 */
export function sevenOnlyLegalTargets(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  const attacker = findShip(state, shipId);
  if (
    attacker.side !== state.sideToMove ||
    state.actedThisPly.includes(shipId) ||
    isBay(attacker.square)
  ) {
    return [];
  }

  return reachFrom(attacker.square, attacker.shields)
    .map((entry) => entry.destination)
    .filter(
      (square) =>
        sevenOnlyAttackRefusalReason(state, shipId, square) === undefined,
    );
}

/**
 * Why `target` is not a legal attack for `shipId` in the given state, as a
 * structured reason, or `undefined` when the attack is legal. Layers §9's
 * game-over check on top of `sevenOnlyAttackRefusalReason`.
 *
 * The game-over check runs first, ahead of ownership: once the game has
 * ended, no attack is legal for anyone, including one that would have been
 * refused anyway. It is deliberately absent from `sevenOnlyAttackRefusalReason`
 * — that layer exists so the §5 pass guard can ask "is any action legal
 * here" without this question answering it; see `applyPassGuard` in
 * `ply.ts`.
 */
export function attackRefusalReason(
  state: GameState,
  shipId: ShipId,
  target: Square,
): AttackRefusalReason | undefined {
  if (isGameOver(state)) {
    return "game-over";
  }

  const attacker = findShip(state, shipId);

  if (attacker.side !== state.sideToMove) {
    return "not-your-ship";
  }
  if (state.actedThisPly.includes(shipId)) {
    return "ship-already-acted";
  }

  return sevenOnlyAttackRefusalReason(state, shipId, target);
}

/**
 * Every square `shipId` may legally attack in the given state: every square
 * within its §6 movement reach holding an enemy ship, with §9's game-over
 * check applied at the ship level exactly as in `attackRefusalReason` —
 * empty once the game is over.
 */
export function legalTargets(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  if (isGameOver(state)) {
    return [];
  }

  const attacker = findShip(state, shipId);
  if (attacker.side !== state.sideToMove) {
    return [];
  }

  return sevenOnlyLegalTargets(state, shipId);
}

/**
 * The outcome of a fight (rules.md §7), decided by shield count alone.
 * `winnerRemainingShields` is the winner's shield count after the fight,
 * `winner − (loser + 1)` — always present with a winner, and always a valid
 * `ShieldCount`, because the winner by definition carries more shields than
 * the loser plus the one shield the fight costs.
 */
export type FightOutcome =
  | {
      readonly result: "attacker-won";
      readonly winnerRemainingShields: ShieldCount;
    }
  | {
      readonly result: "defender-won";
      readonly winnerRemainingShields: ShieldCount;
    }
  | { readonly result: "mutual-return" };

/**
 * Decides a fight from the two ships' shield counts alone (rules.md §7). The
 * stronger ship wins and keeps `winner − (loser + 1)` shields; the weaker
 * ship is beaten — including when the **defender** is stronger, in which
 * case the defender wins and the attacker is the one sent home; equal
 * counts send both ships home.
 *
 * `winner − (loser + 1)` is asserted to be a valid `ShieldCount`: the winner
 * by definition carries strictly more shields than the loser, so
 * `winner ≥ loser + 1` and the result can never be negative.
 */
export function resolveFight(
  attackerShields: ShieldCount,
  defenderShields: ShieldCount,
): FightOutcome {
  if (attackerShields === defenderShields) {
    return { result: "mutual-return" };
  }

  const winnerShields =
    attackerShields > defenderShields
      ? attackerShields - (defenderShields + 1)
      : defenderShields - (attackerShields + 1);

  if (!isShieldCount(winnerShields)) {
    throw new RangeError(
      `a fight's winner cannot end with ${winnerShields} shields`,
    );
  }

  return attackerShields > defenderShields
    ? { result: "attacker-won", winnerRemainingShields: winnerShields }
    : { result: "defender-won", winnerRemainingShields: winnerShields };
}

/**
 * The bay a returning ship lands in, drawn at random from the bays that are
 * empty right now (rules.md §7.1): a seed in, `[bay: Square, nextSeed: number]`
 * out, in the shape `drawIndex` and `mulberry32` already use. The pool
 * is every bay in `BAYS` order with no ship on it, judged against `state`'s
 * current occupancy — recomputed at every point of use and never stored, so
 * a ship moving out of a bay as one action can change the answer for a later
 * one. The caller must store the returned seed.
 *
 * On a mutual return, call this once to place the attacker, then call it
 * again against the state that already holds the attacker **and the
 * advanced seed** to place the defender — there is no separate "second
 * draw" function.
 *
 * Throws if every bay is occupied. §7.1's argument that there is always
 * somewhere to go guarantees this cannot happen, so this is a bug detector,
 * not a case the caller need handle.
 */
export function drawReturnBay(state: GameState): [Square, number] {
  const occupiedSquareNames = new Set(shipsBySquare(state).keys());
  const pool = BAYS.filter(
    (square) => !occupiedSquareNames.has(squareName(square)),
  );

  if (pool.length === 0) {
    throw new RangeError(
      "no empty bay: rules.md §7.1 guarantees this cannot happen",
    );
  }

  const [index, nextSeed] = drawIndex(state.randomSeed, pool.length);
  return [pool[index], nextSeed];
}
