// Combat (rules.md §7, §3.1, §8.5): who may attack whom, and where a winning
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
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import { drawIndex } from "./random";
import { type ShieldCount, isShieldCount } from "./shields";
import { strandedShipIds } from "./stranded";

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
 * square it may legally end on — §6's site restriction and nothing else, not
 * a dormant site, not a depleted site — shaped as the sub-lane the winner
 * actually travels (`destination` is the square it stops on, `passedOver` the
 * lane squares before it). `undefined` when no square on the lane qualifies,
 * meaning the winner holds its ground.
 *
 * `reach` is the attack's own `ReachEntry`, exactly as `attackReach` found
 * it. The lane's occupancy is not re-checked here: it was clear when the
 * attack was judged, and the loser has already been placed in a bay by the
 * time this runs, so nothing between the attacker and the loser's former
 * square can be occupied.
 */
export function winnerAdvance(
  state: GameState,
  reach: ReachEntry,
): ReachEntry | undefined {
  const lane = [...reach.passedOver, reach.destination];

  for (let index = lane.length - 1; index >= 0; index--) {
    const candidate = lane[index];
    const siteState = siteStateAt(state, candidate);
    if (siteState === "dormant" || siteState === "depleted") {
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
  | "another-ship-stranded"
  | "attacker-in-bay"
  | "target-in-bay"
  | "no-target-there"
  | "target-is-friendly"
  | "target-out-of-range"
  | "attack-path-blocked"
  | "game-over";

/**
 * Why `target` is not a legal attack for `shipId` in the given state, under
 * §7 and §3.1 alone, with no awareness of §8.5's stranded-ship obligation.
 * This layer exists so the §5 pass guard can ask "is any action legal here"
 * without §8.5's answer depending on the question, exactly as
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
 * §3.1 alone, ignoring §8.5's stranded-ship obligation. The §7-only
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
 * game-over check and §8.5's stranded-ship obligation on top of
 * `sevenOnlyAttackRefusalReason`.
 *
 * The game-over check runs first, ahead of ownership: once the game has
 * ended, no attack is legal for anyone, including one that would have been
 * refused anyway. It is deliberately absent from `sevenOnlyAttackRefusalReason`
 * — that layer exists so the §5 pass guard can ask "is any action legal
 * here" without this question answering it; see `applyPassGuard` in
 * `ply.ts`.
 *
 * Ownership and the already-acted check are duplicated here ahead of §8.5's
 * stranded check, exactly as `moveRefusalReason` duplicates them ahead of
 * its own stranded check, so the refusal a player hears has the same
 * priority whichever action they attempted: a ship that has already acted is
 * told so, rather than being told a stranded ship elsewhere needs moving.
 *
 * §8.5 refuses **every** attack while any ship owes an action — including an
 * attack by the owing ship itself. Unlike `moveRefusalReason`, which excuses
 * the ships that owe (`!owed.includes(shipId)`), there is no exception here:
 * §8.5 requires the freeing action to be a move, so while the obligation
 * binds it blocks every attack the same way, whoever it is by. The reason
 * string is the same `"another-ship-stranded"` moves use, so the player
 * hears one sentence whichever action they tried.
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
  if (strandedShipIds(state).length > 0) {
    return "another-ship-stranded";
  }

  return sevenOnlyAttackRefusalReason(state, shipId, target);
}

/**
 * Every square `shipId` may legally attack in the given state: every square
 * within its §6 movement reach holding an enemy ship, with §9's game-over
 * check and §8.5's obligation applied at the ship level exactly as in
 * `attackRefusalReason` — empty once the game is over, and refusing every
 * ship's attacks, including the owing ship's own, while any ship owes an
 * action.
 */
export function legalTargets(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  if (isGameOver(state)) {
    return [];
  }

  const attacker = findShip(state, shipId);
  if (attacker.side !== state.sideToMove || strandedShipIds(state).length > 0) {
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
 * empty right now (rules.md §7.1): a seed in, the drawn square and the next
 * seed out, in the shape `drawIndex` and `mulberry32` already use. The pool
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
