// Combat (rules.md §7, §3.1): who may attack whom, and where a returning
// ship lands. This is the only implementation of §7 in the app, the way
// `movement.ts` is the only implementation of §6. Attack range **is** §6's
// movement range: a ship attacks exactly as far as it moves, path and all, so
// `attackReach` reads `reachFrom` (rules.md §6) rather than carrying a second
// copy of the table. There is one implementation of the table, and both
// sections read it.

import { type Square, squareName } from "./board";
import { BAYS, isBay } from "./bays";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, shipsBySquare, nodeStateAt } from "./gameState";
import { type ReachEntry, findShip, reachFrom } from "./movement";
import { drawIndex } from "./random";

/**
 * The lane `shipId` would attack down to reach `target`: the `ReachEntry`
 * from `reachFrom(attacker.square, attacker.power)` whose `destination` is
 * `target`, or `undefined` when `target` is outside the attacker's reach
 * altogether. Purely geometric — no ownership, no bays, no occupancy, no
 * awareness of whose ply it is. Exported so the lane geometry can be
 * unit-tested directly, alongside the legality check below that reads it.
 */
export function attackReach(
  state: GameState,
  shipId: ShipId,
  target: Square,
): ReachEntry | undefined {
  const attacker = findShip(state, shipId);
  const targetName = squareName(target);

  return reachFrom(attacker.square, attacker.power).find(
    (entry) => squareName(entry.destination) === targetName,
  );
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
  | "attacker-on-charged-node"
  | "target-in-bay"
  | "target-on-charged-node"
  | "no-target-there"
  | "target-is-friendly"
  | "target-out-of-range"
  | "attack-path-blocked"
  | "game-over";

/**
 * Why `target` is not a legal attack for `shipId` in the given state, as a
 * structured reason, or `undefined` when the attack is legal.
 *
 * Checked most fundamental first: whether the game is even still being
 * played, then whose ship it is, then whether it has already acted, then the
 * attacker's own bay, then whether the attacker holds a charged node
 * (rules.md §7 — a ship holding a node cannot attack), then everything about
 * the target — no ship there, a friendly ship, a ship in a bay, a ship
 * holding a charged node — and only then range and path, which come last so
 * a protected or bay target within reach is still refused as such rather
 * than as an out-of-range square. Once the game has ended, no attack is
 * legal for anyone, including one that would have been refused anyway.
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
  if (isBay(attacker.square)) {
    return "attacker-in-bay";
  }
  if (nodeStateAt(state, attacker.square) === "charged") {
    return "attacker-on-charged-node";
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
  if (nodeStateAt(state, target) === "charged") {
    return "target-on-charged-node";
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
 * Every square `shipId` may legally attack in the given state: every square
 * within its §6 movement reach holding an enemy ship, with §9's game-over
 * check applied first — empty once the game is over.
 */
export function legalTargets(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  if (isGameOver(state)) {
    return [];
  }

  const attacker = findShip(state, shipId);
  if (
    attacker.side !== state.sideToMove ||
    state.actedThisPly.includes(shipId) ||
    isBay(attacker.square) ||
    nodeStateAt(state, attacker.square) === "charged"
  ) {
    return [];
  }

  return reachFrom(attacker.square, attacker.power)
    .map((entry) => entry.destination)
    .filter(
      (square) => attackRefusalReason(state, shipId, square) === undefined,
    );
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
 * Every fight returns two ships: call this once to place the attacker, then
 * call it again against the state that already holds the attacker **and the
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
