// §8.6 step 7's choice, run as the last step of the end-of-turn sequence: if
// every one of a side's ships is trapped, the depleted node with the least
// remaining life among those whose ship would actually have a legal move
// once freed ends at once, so that side is not left to pass for however many
// turns its trap countdown would otherwise still take. A tie on remaining
// life cannot arise (§8.3: every trap starts at the expiry that caused it, at
// most one per ply, and all countdowns are the same length, so a side's
// trapped ships' nodes never share a remaining life); on the unreachable
// case anyway, the first candidate in board order wins, deterministically.
// This module answers only the *choice* — which square, if any, should end
// early for a given side — and mutates no state and draws nothing from the
// seed. `endOfTurn.ts` is the one caller, and it is the one that retires the
// chosen node, replaces it and frees the ship, reusing the same machinery an
// ordinary retirement (§8.6 step 6) already uses.
//
// It depends on `trap.ts` (who is trapped) and `movement.ts`
// (`legalDestinations`, to test the hypothetical), which is why it cannot
// live in `trap.ts` itself without creating an import cycle — see
// `trap.ts`'s header. The layering is strictly one-way: `trap` ← `movement`
// ← `relief` ← `endOfTurn`.

import { type Square, squareName } from "./board";
import type { Side } from "./fleet";
import { type GameState, type Ship, nodeStatusAt } from "./gameState";
import { legalDestinations } from "./movement";
import { isSideAllTrapped, trappedShips } from "./trap";

/**
 * Whether `ship` — trapped on the depleted node at `square` — would have a
 * legal move if that node ended right now. Built as a genuinely hypothetical
 * `GameState`: the candidate node's own entry is removed, so the ship's
 * square becomes an ordinary square, while every other node (in
 * particular every other depleted node, still barring landing) and every
 * ship (friendly and enemy alike, still blocking as they will) are left
 * exactly as they are. `sideToMove` is set to the ship's own side, because
 * the question is whether the ship would have a move on its own turn, not on
 * whichever ply just happened to end — step 7 asks this for the side that
 * did not just move, too.
 *
 * Only a **move** is considered, never an attack (§8.6 step 7 as written):
 * the relief exists to give a boxed-in player somewhere to go, and the
 * always-affordable free one-square orthogonal move is exactly that
 * somewhere. A freed ship with an attack but no move does not qualify; §5's
 * pass rule already covers a player with genuinely nothing.
 *
 * `legalDestinations` answers nothing once the game is over. During
 * `runEndOfTurn` the ply counter has not yet advanced, so on an ordinary
 * final ply the game is not over yet and this behaves normally. The one case
 * where it does bite is a state where both sides are already out of time
 * (§10): the game is over, nothing further will be played, and a relief that
 * does not fire there changes nothing observable and consumes no seed. That
 * is deliberately not special-cased.
 */
function wouldHaveLegalMoveIfFreed(
  state: GameState,
  ship: Ship,
  square: Square,
): boolean {
  const nodesWithoutCandidate = { ...state.nodes };
  delete nodesWithoutCandidate[squareName(square)];

  const hypothetical: GameState = {
    ...state,
    nodes: nodesWithoutCandidate,
    sideToMove: ship.side,
  };

  return legalDestinations(hypothetical, ship.id).length > 0;
}

/**
 * The square of the depleted node that should end at once to relieve `side`
 * (rules.md §8.6 step 7), or `undefined` if nothing should. Answers nothing
 * unless every one of `side`'s ships is trapped; among the depleted nodes
 * trapping them, only those whose ship would have a legal move once freed
 * (`wouldHaveLegalMoveIfFreed`) are candidates; the candidate with the
 * **lowest** `level` wins, since a depleted node's level counts down towards
 * zero and so the lowest level is the least remaining life.
 *
 * If two or more candidates tie on the lowest level, the first in board
 * order wins — the same order `trappedShips` already walks candidates in.
 * This case cannot arise in play (§8.3): every trap starts at the expiry
 * that caused it, at most one per ply, so a side's trapped ships' nodes
 * always have distinct remaining lives. Draws nothing from the seed and
 * mutates nothing reachable from `state`.
 */
export function reliefSquare(state: GameState, side: Side): Square | undefined {
  if (!isSideAllTrapped(state, side)) {
    return undefined;
  }

  const candidates: { readonly square: Square; readonly level: number }[] = [];

  trappedShips(state, side).forEach((ship) => {
    const square = ship.square;
    if (!wouldHaveLegalMoveIfFreed(state, ship, square)) {
      return;
    }

    candidates.push({ square, level: nodeStatusAt(state, square)!.level });
  });

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((lowest, candidate) =>
    candidate.level < lowest.level ? candidate : lowest,
  ).square;
}
