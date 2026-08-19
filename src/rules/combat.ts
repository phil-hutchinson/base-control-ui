// Combat (rules.md §7, §3.1, §8.5): who may attack whom. This is the only
// implementation of §7 in the app, the way `movement.ts` is the only
// implementation of §6. Attack range is a fixed set of eight neighbouring
// squares, independent of shield count — deliberately written out rather
// than derived from `reachFrom` (rules.md §6), whose per-shield table §7's
// range must not be coupled to: a 4-shield ship strikes all eight
// neighbours while it can only step one square orthogonally.

import {
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";
import { CLOCKWISE_BAYS, bayNumberingFrom, isBay } from "./bays";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { findShip } from "./moveLegality";
import { type GameState, shipsBySquare } from "./gameState";
import { type ShieldCount, isShieldCount } from "./shields";
import { strandedShipIds } from "./stranded";

/** The eight offsets to a square's neighbours, diagonals included. */
const ADJACENT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * The eight squares surrounding `square`, diagonals included, filtered to
 * squares actually on the board (five on an edge, three at a corner). §7's
 * whole attack range, fixed and independent of shield count.
 */
export function adjacentSquares(square: Square): readonly Square[] {
  const columnIndex = COLUMN_LETTERS.indexOf(square.column);
  const squares: Square[] = [];

  for (const [deltaColumn, deltaRow] of ADJACENT_OFFSETS) {
    const column = COLUMN_LETTERS[columnIndex + deltaColumn];
    const row = square.row + deltaRow;
    if (column !== undefined && isOnBoard(column, row)) {
      squares.push(squareAt(column, row));
    }
  }

  return squares;
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
  | "another-ship-stranded"
  | "attacker-in-bay"
  | "target-in-bay"
  | "no-target-there"
  | "target-is-friendly"
  | "target-not-adjacent"
  | "game-over";

/**
 * Why `target` is not a legal attack for `shipId` in the given state, under
 * §7 and §3.1 alone, with no awareness of §8.5's stranded-ship obligation.
 * This layer exists so the §5 pass guard can ask "is any action legal here"
 * without §8.5's answer depending on the question, exactly as
 * `sixOnlyMoveRefusalReason` does for §6.
 *
 * Checked most fundamental first: whose ship it is, then the attacker's own
 * bay, then everything about the target — no ship there, a friendly ship, a
 * ship in a bay, not adjacent.
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
  if (
    !adjacentSquares(attacker.square).some(
      (square) => squareName(square) === squareName(target),
    )
  ) {
    return "target-not-adjacent";
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
  if (attacker.side !== state.sideToMove || isBay(attacker.square)) {
    return [];
  }

  return adjacentSquares(attacker.square).filter(
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
 * §8.5 refuses **every** attack while any ship owes an action — including an
 * attack by the owing ship itself. Unlike `moveRefusalReason`, which excuses
 * the ships that owe (`!owed.includes(shipId)`), there is no exception here:
 * a move can free a stranded ship, but an attack never does, so while the
 * obligation binds it blocks every attack the same way. The reason string is
 * the same `"another-ship-stranded"` moves use, so the player hears one
 * sentence whichever action they tried.
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
  if (strandedShipIds(state).length > 0) {
    return "another-ship-stranded";
  }

  return sevenOnlyAttackRefusalReason(state, shipId, target);
}

/**
 * Every square `shipId` may legally attack in the given state: its §7
 * neighbours, with §9's game-over check and §8.5's obligation applied at the
 * ship level exactly as in `attackRefusalReason` — empty once the game is
 * over, and refusing every ship's attacks, including the owing ship's own,
 * while any ship owes an action.
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
 * Return position 1 (rules.md §7.1): the bay `state.returnPositionIndex`
 * names in `CLOCKWISE_BAYS`.
 */
export function returnPositionSquare(state: GameState): Square {
  return CLOCKWISE_BAYS[state.returnPositionIndex];
}

/**
 * The bay a ship returning to a bay right now would actually land in
 * (rules.md §7.1): the first empty bay counting clockwise from return
 * position 1, judged against `state`'s current occupancy. Recomputed at
 * every point of use and never stored — occupancy changes inside a ply, so
 * a ship moving out of a bay as the first action can change the answer for
 * the second.
 *
 * On a mutual return, call this once to place the attacker, then call it
 * again against the state that already contains the attacker to place the
 * defender — there is no separate "second receptacle" function.
 *
 * Throws if every bay is occupied. §7.1's argument that there is always
 * somewhere to go guarantees this cannot happen, so this is a bug
 * detector, not a case the caller need handle.
 */
export function receptacleBay(state: GameState): Square {
  const occupiedSquareNames = new Set(shipsBySquare(state).keys());
  const receptacle = bayNumberingFrom(state.returnPositionIndex).find(
    (square) => !occupiedSquareNames.has(squareName(square)),
  );

  if (receptacle === undefined) {
    throw new RangeError(
      "no empty bay: rules.md §7.1 guarantees this cannot happen",
    );
  }

  return receptacle;
}
