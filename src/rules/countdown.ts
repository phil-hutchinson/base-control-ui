// A node's countdown (rules.md §8.3): the plies a charged or depleted node
// has left once one is running, the number it shows for that, and the
// position its artwork sits at. A pure leaf — it knows a node's `state` and
// its `level` (plies remaining) and nothing about `GameState` — so
// `endOfTurn.ts`, `ply.ts` and `../board/Board.tsx` can all import it
// without reaching into `nodes.ts`, which owns the deal instead.
//
// Import direction is one-way: `nodes.ts` never imports this module.
//
// Two constants are both 11 plies, and that is deliberate, not duplication:
// `CHARGED_COUNTDOWN_PLIES` answers "how long does a held node last", and
// `TRAP_COUNTDOWN_PLIES` answers "how long does a trap last" — different
// questions that happen to share a value today, and either could be
// retuned alone tomorrow without the other moving.

import type { NodeState } from "./nodes";

/**
 * How many plies a charged node's countdown is set to the moment a ship
 * moves onto it (rules.md §8.3). Starting mid-turn, its eleven plies land
 * on six of the holder's own turn ends.
 */
export const CHARGED_COUNTDOWN_PLIES = 11;

/**
 * How many plies a depleted node's countdown is set to when it traps a ship
 * (rules.md §8.3). Starting at a turn end, its eleven plies land on five of
 * the trapped player's own turn ends.
 */
export const TRAP_COUNTDOWN_PLIES = 11;

/**
 * How many plies a depleted node's countdown is set to when its holder
 * walks off, leaving it empty (rules.md §8.3). Starting mid-turn, it spends
 * its first ply at the end of that same turn and its second at the end of
 * the opponent's, then retires.
 */
export const EXIT_COUNTDOWN_PLIES = 2;

/**
 * Spends one ply of a countdown, floored at zero. A charged node's `level`
 * of 0 means "no countdown" (`gameState.ts`'s `NodeStatus` doc comment), so
 * this is never called on one — callers only spend a countdown that is
 * already running.
 */
export function spendPly(plyRemaining: number): number {
  return Math.max(0, plyRemaining - 1);
}

/**
 * The number a node shows in its middle, or `undefined` when it shows none
 * (rules.md §8.3): how many of the holder's own turns the node has left.
 *
 * - A charged node with no countdown (`plyRemaining === 0`) shows nothing —
 *   it is at baseline.
 * - A charged node with a countdown counts down from the moment a ship steps
 *   on: `ceil(plyRemaining / 2)`, 6 down to 1, never 0.
 * - A depleted node with a ship on it (a trap) counts the trapped player's
 *   own turns: `floor(plyRemaining / 2)`, floored at 1 so the last ply
 *   still reads 1 rather than 0.
 * - A depleted node with no ship on it (the exit left by a holder walking
 *   off) shows nothing at all, however many plies it has left.
 */
export function countdownNumber(
  state: NodeState,
  plyRemaining: number,
  hasShip: boolean,
): number | undefined {
  if (state === "charged") {
    if (plyRemaining <= 0) {
      return undefined;
    }
    return Math.ceil(plyRemaining / 2);
  }

  if (state === "depleted" && hasShip) {
    return Math.max(1, Math.floor(plyRemaining / 2));
  }

  return undefined;
}

/**
 * How far a node's countdown has travelled through its state's own artwork
 * cycle (rules.md §8.3's "ball"), in [0, 1]: 0 at the start, 1 at the last
 * ply. The ball grows one step per ply, so this rises by exactly one tenth
 * per ply spent.
 *
 * - A charged node with no countdown sits at the minimum (0) indefinitely.
 * - A charged node or a trap with `p` plies left sits at `(11 − p) / 10` —
 *   0 the ply a countdown starts, 1 with one ply left.
 * - A depleted node with no ship (the exit) sits at 0 for both of its
 *   plies — too little life to be worth travelling, and too few steps to
 *   read.
 */
export function nodeCyclePosition(
  state: NodeState,
  plyRemaining: number,
  hasShip: boolean,
): number {
  if (state === "charged" && plyRemaining <= 0) {
    return 0;
  }

  if (state === "depleted" && !hasShip) {
    return 0;
  }

  const raw = (11 - plyRemaining) / 10;
  return Math.min(1, Math.max(0, raw));
}
