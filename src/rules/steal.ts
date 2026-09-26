// Steal's own node rules (steal.md): a node as a signal with two squares,
// helpers to read a node's squares, whether it is Open or Held and its
// anchor, and the opening deal (steal.md §7). A leaf module: it imports
// `board.ts` and `nodePlacement.ts` for the geometry and the draws, and only
// types from `gameState.ts` and `nodes.ts` — `gameState.ts` calls into this
// for the deal, and `ply.ts` calls into it for the two events (steal.md
// §§3-5).
//
// The opening deal's seed steps, in this fixed order, so a recorded game
// replays exactly:
//
// 1. Each node's first prospective square, signal 0 through N-1 in turn,
//    drawn uniformly from the strict pool by `drawNodeSquare`, each seeing
//    the squares already placed. N seed steps.
// 2. Each node's second prospective square, signal 0 through N-1 in turn,
//    drawn by `drawStealProspectiveSquare`, anchored on that signal's first
//    square, weighted against every other signal's square placed so far. N
//    more seed steps.
//
// 2N seed steps in total, nothing else.

import { ALL_SQUARES, type Square, squareName } from "./board";
import type { NodeStatus } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import { drawNodeSquare, drawStealProspectiveSquare } from "./nodePlacement";

/** A node's identity under steal (steal.md §2): one per node, 0 to 4. */
export type NodeSignal = 0 | 1 | 2 | 3 | 4;

/**
 * The offered signals, in the order a game of N nodes uses them: a
 * three-node game uses the first three, and so on.
 */
export const NODE_SIGNALS: readonly NodeSignal[] = [0, 1, 2, 3, 4];

/** One node's status under steal: always level 0, always carrying its signal. */
export interface StealNodeStatus {
  readonly state: "charged" | "prospective";
  readonly level: 0;
  readonly signal: NodeSignal;
}

/** A steal node map, keyed by square name — structurally a `GameState.nodes` under steal. */
export type StealNodeMap = Readonly<Record<string, StealNodeStatus>>;

/**
 * One signal's squares in board order: two once it is fully dealt, or one
 * while the deal, a claim or an abandon has placed or left exactly one
 * square for it and is about to draw its partner.
 */
export function squaresForSignal(
  nodes: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
): readonly Square[] {
  return ALL_SQUARES.filter(
    (square) => nodes[squareName(square)]?.signal === signal,
  );
}

/** Whether a signal's node is Held (one charged, one prospective) rather than Open (steal.md §2). */
export function isNodeHeld(
  nodes: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
): boolean {
  return squaresForSignal(nodes, signal).some(
    (square) => nodes[squareName(square)]?.state === "charged",
  );
}

/**
 * A signal's anchor for the weighted draw (steal.md §6): its charged square
 * if it is Held, otherwise its one remaining square — meaningful only
 * mid-transition, while the deal, a claim or an abandon has left exactly one
 * square for this signal and is about to draw its partner. Throws if the
 * signal currently holds anything other than a held pair or exactly one
 * unheld square.
 */
export function nodeAnchor(
  nodes: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
): Square {
  const squares = squaresForSignal(nodes, signal);
  const charged = squares.find(
    (square) => nodes[squareName(square)]?.state === "charged",
  );
  if (charged !== undefined) {
    return charged;
  }
  if (squares.length !== 1) {
    throw new RangeError(
      `nodeAnchor: signal ${signal} has ${squares.length} squares and none charged — expected exactly one`,
    );
  }
  return squares[0];
}

/**
 * Deals the opening board under steal (steal.md §7): every node Open, no
 * charged square anywhere. Each signal's first prospective square is drawn
 * uniformly from the strict pool, one at a time, signal 0 through
 * `nodeCount - 1`; then each signal's second is drawn by
 * `drawStealProspectiveSquare`, anchored on the first, weighted against
 * every other signal's square placed so far, in the same order. Exactly
 * `2 * nodeCount` seed steps.
 */
export function dealStealOpeningBoard(
  shipSquares: readonly Square[],
  nodeCount: ChargedNodeCount,
  seed: number,
): [nodes: StealNodeMap, nextSeed: number] {
  const signals = NODE_SIGNALS.slice(0, nodeCount);
  const nodes: Record<string, StealNodeStatus> = {};
  let workingSeed = seed;

  const firstSquares: Square[] = [];
  for (const signal of signals) {
    const [square, nextSeed] = drawNodeSquare(
      firstSquares,
      shipSquares,
      workingSeed,
    );
    firstSquares.push(square);
    nodes[squareName(square)] = { state: "prospective", level: 0, signal };
    workingSeed = nextSeed;
  }

  signals.forEach((signal, index) => {
    const anchor = firstSquares[index];
    const occupiedNodeSquares = ALL_SQUARES.filter(
      (square) => nodes[squareName(square)] !== undefined,
    );
    const otherNodeSquares = occupiedNodeSquares.filter(
      (square) => nodes[squareName(square)]?.signal !== signal,
    );
    const [square, nextSeed] = drawStealProspectiveSquare(
      occupiedNodeSquares,
      anchor,
      otherNodeSquares,
      shipSquares,
      workingSeed,
    );
    nodes[squareName(square)] = { state: "prospective", level: 0, signal };
    workingSeed = nextSeed;
  });

  return [nodes, workingSeed];
}
