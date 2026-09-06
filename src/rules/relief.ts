// §8.6 step 7's choice, run as the last step of the end-of-turn sequence: if
// every one of a side's ships is trapped, the depleted node with the least
// remaining life among those whose ship would actually have a legal move
// once freed ends at once, so that side is not left to pass for the ten
// turns its recovery clock would otherwise take. A tie on remaining life is
// broken at random, drawing from the seeded stream (§8.6 step 7). This
// module answers only the *choice* — which square, if any, should end early
// for a given side, and the seed to carry forward — and mutates no state.
// `endOfTurn.ts` is the one caller, and it is the one that retires the
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
import { drawIndex } from "./random";
import { isSideAllTrapped, trappedShips } from "./trap";

/**
 * Whether `ship` — trapped on the depleted node at `square` — would have a
 * legal move if that node ended right now. Built as a genuinely hypothetical
 * `GameState`: the candidate node's own entry is removed, so the ship's
 * square becomes an ordinary square, while every other node (in
 * particular every other depleted node, still barring landing) and every
 * ship (friendly and enemy alike, still blocking as they will) are left
 * exactly as they are. `sideToMove` is set to the ship's own side and
 * `actedThisPly` is emptied, because the question is whether the ship would
 * have a move on its own turn, not on whichever ply just happened to end —
 * step 7 asks this for the side that did not just move, too.
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
    actedThisPly: [],
  };

  return legalDestinations(hypothetical, ship.id).length > 0;
}

/**
 * The square of the depleted node that should end at once to relieve `side`
 * (rules.md §8.6 step 7), alongside the seed to carry forward, or
 * `undefined` and the seed unchanged if nothing should. Answers nothing
 * unless every one of `side`'s ships is trapped; among the depleted nodes
 * trapping them, only those whose ship would have a legal move once freed
 * (`wouldHaveLegalMoveIfFreed`) are candidates; the candidate with the
 * **lowest** `level` wins, since a depleted node's level counts down towards
 * zero and so the lowest level is the least remaining life.
 *
 * If two or more candidates tie on the lowest level, one of them is chosen
 * at random, with every tied candidate equally likely (§8.6 step 7). The
 * seed is drawn from **only in that case**: a single lowest candidate, or no
 * candidate at all, leaves `state.randomSeed` untouched, so seed consumption
 * stays a predictable function of the board and a relief that could not
 * possibly need a random choice never spends one.
 *
 * Mutates nothing reachable from `state`; the caller is responsible for
 * carrying the returned seed forward into the state it goes on to use.
 */
export function reliefSquare(
  state: GameState,
  side: Side,
): [square: Square | undefined, nextSeed: number] {
  if (!isSideAllTrapped(state, side)) {
    return [undefined, state.randomSeed];
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
    return [undefined, state.randomSeed];
  }

  const lowestLevel = Math.min(
    ...candidates.map((candidate) => candidate.level),
  );
  const tied = candidates.filter(
    (candidate) => candidate.level === lowestLevel,
  );

  if (tied.length === 1) {
    return [tied[0].square, state.randomSeed];
  }

  const [index, nextSeed] = drawIndex(state.randomSeed, tied.length);
  return [tied[index].square, nextSeed];
}
