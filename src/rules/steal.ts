// Steal's own node rules (steal.md): a node as a signal with two squares,
// helpers to read a node's squares, whether it is Open or Held and its
// anchor, the opening deal (steal.md §7) and its two events, claiming and
// abandoning a node (steal.md §§3-4). A leaf module: it imports `board.ts`
// and `nodePlacement.ts` for the geometry and the draws, and only types from
// `gameState.ts` and `nodes.ts` — `gameState.ts` calls into this for the
// deal, and `ply.ts` calls into it for the two events as a move resolves
// (steal.md §5).
//
// The opening deal's seed steps, in this fixed order, so a recorded game
// replays exactly:
//
// 1. Each node's first prospective square, signal 0 through N-1 in turn,
//    drawn uniformly from the strict pool by `drawNodeSquare`, each seeing
//    the squares already placed. N seed steps.
// 2. Each node's second prospective square, signal 0 through N-1 in turn,
//    drawn by `drawStealOpeningProspectiveSquare`, anchored on that signal's
//    first square, weighted against every other signal's square placed so
//    far, over rules.md §3.2's strict pool where the board leaves room (only
//    falling back to the widened pool, or from there to §3.2's own fallback,
//    when it does not — steal.md §7). N more seed steps.
//
// 2N seed steps in total, nothing else.
//
// Once play is under way, `claimNode` and `abandonNode` each draw exactly
// one fresh prospective square and so advance the seed exactly once. When a
// single move both abandons one node and claims another, `ply.ts` calls
// `abandonNode` first and threads its returned seed into `claimNode` —
// leaving comes before claiming (steal.md §5) — for two seed steps in that
// order.

import { ALL_SQUARES, type Square, squareName } from "./board";
import type { Side } from "./fleet";
import type { NodeStatus } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import {
  drawNodeSquare,
  drawStealOpeningProspectiveSquare,
  drawStealProspectiveSquare,
} from "./nodePlacement";

/** A node's identity under steal (steal.md §2): one per node, 0 to 4. */
export type NodeSignal = 0 | 1 | 2 | 3 | 4;

/**
 * The offered signals, in the order a game of N nodes uses them: a
 * three-node game uses the first three, and so on.
 */
export const NODE_SIGNALS: readonly NodeSignal[] = [0, 1, 2, 3, 4];

/**
 * The signal matched to `side` under player-matching nodes (steal.md §9), in
 * a game of `nodeCount` nodes: red is matched to the second-to-last signal,
 * green to the last — the two signals whose colours the app replaces with
 * the players' own. Neither this nor `sideMatchedToSignal` consults the
 * player-matching setting; callers check `state.playerMatching !== "off"`
 * first.
 */
export function matchedSignalForSide(
  side: Side,
  nodeCount: ChargedNodeCount,
): NodeSignal {
  return (side === "red" ? nodeCount - 2 : nodeCount - 1) as NodeSignal;
}

/**
 * The side `signal` is matched to under player-matching nodes (steal.md §9),
 * in a game of `nodeCount` nodes, or `undefined` if it is matched to
 * neither. The inverse of `matchedSignalForSide`.
 */
export function sideMatchedToSignal(
  signal: NodeSignal,
  nodeCount: ChargedNodeCount,
): Side | undefined {
  if (signal === nodeCount - 2) {
    return "red";
  }
  if (signal === nodeCount - 1) {
    return "green";
  }
  return undefined;
}

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

/** The outcome of claiming a node (steal.md §3): the resulting node map, the next seed, and the squares the claim changed. */
export interface ClaimNodeResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  /** The node's previous charged square, present only when the node was Held. */
  readonly releasedSquare?: Square;
  /** The node's other prospective square, present only when the node was Open. */
  readonly discardedSquare?: Square;
  /** The fresh prospective square drawn for the node's signal. */
  readonly newProspective: Square;
}

/**
 * Claims `signal`'s node by landing on its prospective square at
 * `claimedSquare` (steal.md §3): `claimedSquare` becomes the node's charged
 * square; if the node was Held, its previous charged square is released
 * (whoever held it — including the claiming ship's own side, a relocation —
 * loses the node); if the node was Open, its other prospective square is
 * discarded; and one fresh prospective square is drawn, anchored on
 * `claimedSquare`, weighted against every other signal's current squares
 * (`drawStealProspectiveSquare`, steal.md §6). `shipSquares` is the board's
 * ship squares as they stand once the claiming move has resolved. Exactly
 * one seed step. Whether a ship is left standing on the released square, and
 * whose it is, is for the caller to determine — this function knows nothing
 * about ships beyond where they stand for the draw's pool.
 */
export function claimNode(
  nodesBefore: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
  claimedSquare: Square,
  shipSquares: readonly Square[],
  seed: number,
): ClaimNodeResult {
  const previousSquares = squaresForSignal(nodesBefore, signal);
  const releasedSquare = previousSquares.find(
    (square) => nodesBefore[squareName(square)]?.state === "charged",
  );
  const discardedSquare =
    releasedSquare === undefined
      ? previousSquares.find(
          (square) => squareName(square) !== squareName(claimedSquare),
        )
      : undefined;

  const nodes: Record<string, NodeStatus> = { ...nodesBefore };
  if (releasedSquare !== undefined) {
    delete nodes[squareName(releasedSquare)];
  }
  if (discardedSquare !== undefined) {
    delete nodes[squareName(discardedSquare)];
  }
  nodes[squareName(claimedSquare)] = { state: "charged", level: 0, signal };

  const occupiedNodeSquares = ALL_SQUARES.filter(
    (square) => nodes[squareName(square)] !== undefined,
  );
  const otherNodeSquares = occupiedNodeSquares.filter(
    (square) => nodes[squareName(square)]?.signal !== signal,
  );
  const [newProspective, nextSeed] = drawStealProspectiveSquare(
    occupiedNodeSquares,
    claimedSquare,
    otherNodeSquares,
    shipSquares,
    seed,
  );
  nodes[squareName(newProspective)] = {
    state: "prospective",
    level: 0,
    signal,
  };

  return { nodes, nextSeed, releasedSquare, discardedSquare, newProspective };
}

/** The outcome of abandoning a node (steal.md §4): the resulting node map, the next seed, and the fresh prospective square drawn. */
export interface AbandonNodeResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  readonly newProspective: Square;
}

/**
 * Abandons `signal`'s node by vacating its charged square at
 * `vacatedSquare`, without landing on that node's own prospective square
 * (steal.md §4): the vacated square becomes ordinary board, and a second
 * prospective square is drawn, anchored on the one the node already has,
 * weighted against every other signal's current squares
 * (`drawStealProspectiveSquare`, steal.md §6). `shipSquares` is the board's
 * ship squares as they stand once the abandoning move has resolved. Exactly
 * one seed step. Never called for a ship relocating onto its own node's
 * prospective square — that is a claim alone (steal.md §5).
 */
export function abandonNode(
  nodesBefore: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
  vacatedSquare: Square,
  shipSquares: readonly Square[],
  seed: number,
): AbandonNodeResult {
  const nodes: Record<string, NodeStatus> = { ...nodesBefore };
  delete nodes[squareName(vacatedSquare)];

  const anchor = nodeAnchor(nodes, signal);

  const occupiedNodeSquares = ALL_SQUARES.filter(
    (square) => nodes[squareName(square)] !== undefined,
  );
  const otherNodeSquares = occupiedNodeSquares.filter(
    (square) => nodes[squareName(square)]?.signal !== signal,
  );
  const [newProspective, nextSeed] = drawStealProspectiveSquare(
    occupiedNodeSquares,
    anchor,
    otherNodeSquares,
    shipSquares,
    seed,
  );
  nodes[squareName(newProspective)] = {
    state: "prospective",
    level: 0,
    signal,
  };

  return { nodes, nextSeed, newProspective };
}

/**
 * Deals the opening board under steal (steal.md §7): every node Open, no
 * charged square anywhere. Each signal's first prospective square is drawn
 * uniformly from the strict pool, one at a time, signal 0 through
 * `nodeCount - 1`; then each signal's second is drawn by
 * `drawStealOpeningProspectiveSquare`, anchored on the first, weighted
 * against every other signal's square placed so far, in the same order —
 * from the strict pool where the board leaves room, keeping the opening
 * deal's rings off the outer two rings except as a last resort. Exactly
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
    const [square, nextSeed] = drawStealOpeningProspectiveSquare(
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
