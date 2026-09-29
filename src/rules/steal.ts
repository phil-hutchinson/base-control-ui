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
//
// Under planet effects (steal.md §10), two more pure functions change the
// node map outside a claim or a leave. `addExtraProspectiveSquares`
// (Additional nodes) draws one square per signal not already carrying an
// extra, one seed step each. `shuffleProspectiveSignals` (Node scramble)
// moves no square; it takes the signal off every prospective square and
// places the signals back, in this fixed order:
//
// 1. The prospective squares, in board order, each remembered with its
//    signal before the shuffle; a signal's unplaced count starts at how many
//    of those squares carried it.
// 2. The phases: with player-matching on, red's and green's matched signals
//    in ascending signal order, then every other signal of the game in
//    ascending order; with it off, one phase of every signal in ascending
//    order.
// 3. Each placement, while the current phase has a signal unplaced: one
//    weighted draw over the phase's signals in phase order, each weighted by
//    its unplaced count; then one uniform draw over the still-empty squares,
//    in board order, whose signal before the shuffle differs from the drawn
//    one — or, when there is none, over every still-empty square. Both draws
//    are made even when there is only one option.
//
// Exactly two seed steps per prospective square. `activityBonus.ts` calls
// both functions and threads the seed on into its own claim-resolution
// draws.

import { ALL_SQUARES, type Square, squareName } from "./board";
import type { Side } from "./fleet";
import type { GameState, NodeStatus } from "./gameState";
import type { ChargedNodeCount } from "./nodes";
import {
  drawNodeSquare,
  drawStealOpeningProspectiveSquare,
  drawStealProspectiveSquare,
} from "./nodePlacement";
import type { PlayerMatchingSetting } from "./playerMatching";
import { drawIndex, drawWeightedIndex } from "./random";

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

/**
 * The side `signal` is matched to in `state`'s game, or `undefined` when
 * player-matching nodes (steal.md §9) is off or the signal is matched to
 * neither — the one place that decides whether a node is drawn in a
 * player's colour, so the board and the score pips cannot disagree.
 */
export function matchedSideForSignal(
  state: Pick<GameState, "playerMatching" | "chargedNodeCount">,
  signal: NodeSignal,
): Side | undefined {
  return state.playerMatching === "off"
    ? undefined
    : sideMatchedToSignal(signal, state.chargedNodeCount);
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
 * A signal's anchor square or squares for the weighted draw (steal.md §6,
 * §10): its charged square if it is Held; otherwise every one of its
 * prospective squares, the caller weighing distance to the nearest of them.
 * Throws if the signal has no squares at all.
 */
export function nodeAnchor(
  nodes: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
): readonly Square[] {
  const squares = squaresForSignal(nodes, signal);
  const charged = squares.find(
    (square) => nodes[squareName(square)]?.state === "charged",
  );
  if (charged !== undefined) {
    return [charged];
  }
  if (squares.length === 0) {
    throw new RangeError(
      `nodeAnchor: signal ${signal} has no squares to anchor on`,
    );
  }
  return squares;
}

/**
 * Whether `signal`'s node carries an extra (steal.md §10): one prospective
 * square more than usual — two when it is Held, three when it is Open. No
 * particular square is the extra; this is a count.
 */
export function nodeCarriesExtra(
  nodes: Readonly<Record<string, NodeStatus>>,
  signal: NodeSignal,
): boolean {
  const statuses = squaresForSignal(nodes, signal).map(
    (square) => nodes[squareName(square)],
  );
  const held = statuses.some((status) => status?.state === "charged");
  const prospectiveCount = statuses.filter(
    (status) => status?.state === "prospective",
  ).length;
  return prospectiveCount > (held ? 1 : 2);
}

/** The outcome of claiming a node (steal.md §3): the resulting node map, the next seed, and the squares the claim changed. */
export interface ClaimNodeResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  /** The node's previous charged square, present only when the node was Held. */
  readonly releasedSquare?: Square;
  /**
   * The node's other prospective square or squares, discarded by the claim:
   * empty when the node was Held with no extra; one square otherwise
   * (an Open node with no extra, or a Held node carrying one); two squares
   * for an Open node carrying an extra (steal.md §10).
   */
  readonly discardedSquares: readonly Square[];
  /** The fresh prospective square drawn for the node's signal. */
  readonly newProspective: Square;
}

/**
 * Claims `signal`'s node by landing on its prospective square at
 * `claimedSquare` (steal.md §3): `claimedSquare` becomes the node's charged
 * square; if the node was Held, its previous charged square is released
 * (whoever held it — including the claiming ship's own side, a relocation —
 * loses the node); every other prospective square the node had — one or
 * two, depending on whether it was Open or Held and carried an extra
 * (steal.md §10) — is discarded; and one fresh prospective square is drawn,
 * anchored on `claimedSquare`, weighted against every other signal's current
 * squares (`drawStealProspectiveSquare`, steal.md §6). `shipSquares` is the
 * board's ship squares as they stand once the claiming move has resolved.
 * Exactly one seed step. Whether a ship is left standing on the released
 * square, and whose it is, is for the caller to determine — this function
 * knows nothing about ships beyond where they stand for the draw's pool.
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
  const discardedSquares = previousSquares.filter(
    (square) =>
      squareName(square) !== squareName(claimedSquare) &&
      (releasedSquare === undefined ||
        squareName(square) !== squareName(releasedSquare)),
  );

  const nodes: Record<string, NodeStatus> = { ...nodesBefore };
  if (releasedSquare !== undefined) {
    delete nodes[squareName(releasedSquare)];
  }
  for (const square of discardedSquares) {
    delete nodes[squareName(square)];
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
    [claimedSquare],
    otherNodeSquares,
    shipSquares,
    seed,
  );
  nodes[squareName(newProspective)] = {
    state: "prospective",
    level: 0,
    signal,
  };

  return {
    nodes,
    nextSeed,
    releasedSquare,
    discardedSquares,
    newProspective,
  };
}

/** The outcome of abandoning a node (steal.md §4): the resulting node map, the next seed, and the fresh prospective square drawn. */
export interface AbandonNodeResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  readonly newProspective: Square;
}

/**
 * Abandons `signal`'s node by vacating its charged square at `vacatedSquare`,
 * without landing on that node's own prospective square (steal.md §4): the
 * vacated square becomes ordinary board, and a second prospective square is
 * drawn, anchored per `nodeAnchor` on the prospective square or squares the
 * node already has (the nearest counting), weighted against every other
 * signal's current squares (`drawStealProspectiveSquare`, steal.md §6). A node
 * carrying an extra (steal.md §10) still carries it, so it ends Open with three
 * prospective squares. `shipSquares` is the board's ship squares as they stand
 * once the abandoning move has resolved. Exactly one seed step. Never called
 * for a ship relocating onto its own node's prospective square — that is a
 * claim alone (steal.md §5).
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

  const anchors = nodeAnchor(nodes, signal);

  const occupiedNodeSquares = ALL_SQUARES.filter(
    (square) => nodes[squareName(square)] !== undefined,
  );
  const otherNodeSquares = occupiedNodeSquares.filter(
    (square) => nodes[squareName(square)]?.signal !== signal,
  );
  const [newProspective, nextSeed] = drawStealProspectiveSquare(
    occupiedNodeSquares,
    anchors,
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
      [anchor],
      otherNodeSquares,
      shipSquares,
      workingSeed,
    );
    nodes[squareName(square)] = { state: "prospective", level: 0, signal };
    workingSeed = nextSeed;
  });

  return [nodes, workingSeed];
}

/**
 * Whether every one of the game's `nodeCount` signals already carries an
 * extra (steal.md §10, `nodeCarriesExtra`) — the Additional nodes bonus is
 * unavailable exactly when this is true.
 */
export function everyNodeHasExtra(
  nodes: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
): boolean {
  return NODE_SIGNALS.slice(0, nodeCount).every((signal) =>
    nodeCarriesExtra(nodes, signal),
  );
}

/** The outcome of an Additional nodes bonus (steal.md §10). */
export interface AddExtraProspectiveSquaresResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  /** The squares added, one per signal not carrying an extra, in signal order. */
  readonly addedSquares: readonly Square[];
}

/**
 * Gives one more prospective square to every node that does not already
 * carry an extra (steal.md §10, `nodeCarriesExtra`): signal 0 through
 * `nodeCount - 1` in turn, each an ordinary prospective square drawn by
 * section 6's weighted rule (`drawStealProspectiveSquare`), anchored per
 * `nodeAnchor`, weighted against every other node's current squares —
 * including a square just placed for an earlier signal in this same call.
 * A node already carrying an extra is skipped. `shipSquares` is the board's
 * ship squares as they stand at the moment the bonus is claimed. One seed
 * step per square added — none at all when every node already has its
 * extra, in which case the caller should not have called this (see
 * `everyNodeHasExtra`).
 */
export function addExtraProspectiveSquares(
  nodesBefore: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  shipSquares: readonly Square[],
  seed: number,
): AddExtraProspectiveSquaresResult {
  let nodes: Record<string, NodeStatus> = { ...nodesBefore };
  let workingSeed = seed;
  const addedSquares: Square[] = [];

  for (const signal of NODE_SIGNALS.slice(0, nodeCount)) {
    if (nodeCarriesExtra(nodes, signal)) {
      continue;
    }

    const anchors = nodeAnchor(nodes, signal);
    const occupiedNodeSquares = ALL_SQUARES.filter(
      (square) => nodes[squareName(square)] !== undefined,
    );
    const otherNodeSquares = occupiedNodeSquares.filter(
      (square) => nodes[squareName(square)]?.signal !== signal,
    );
    const [square, nextSeed] = drawStealProspectiveSquare(
      occupiedNodeSquares,
      anchors,
      otherNodeSquares,
      shipSquares,
      workingSeed,
    );
    nodes = {
      ...nodes,
      [squareName(square)]: { state: "prospective", level: 0, signal },
    };
    addedSquares.push(square);
    workingSeed = nextSeed;
  }

  return { nodes, nextSeed: workingSeed, addedSquares };
}

/** A prospective square a Node scramble moved from one signal to another. */
export interface RecoloredSquare {
  readonly square: Square;
  readonly oldSignal: NodeSignal;
  readonly newSignal: NodeSignal;
}

/**
 * The outcome of a Node scramble bonus (steal.md §10): the new node map, the
 * seed after its draws, and the prospective squares whose signal changed, in
 * board order — a square the shuffle left on its own signal is not listed.
 */
export interface ShuffleProspectiveSignalsResult {
  readonly nodes: Readonly<Record<string, NodeStatus>>;
  readonly nextSeed: number;
  readonly recoloredSquares: readonly RecoloredSquare[];
}

/**
 * Shuffles the signals on every prospective square between the nodes
 * (steal.md §10). No square is added, removed or moved, charged squares are
 * left exactly as they stand, and each signal keeps as many prospective
 * squares as it had. The signals are placed back one at a time, red's and
 * green's matched signals first when `playerMatching` is on, then the rest:
 * each placement draws a signal weighted by how many of it are still
 * unplaced, then a square uniformly among the still-empty squares whose
 * signal before the shuffle was a different one, or among every still-empty
 * square when there is none. The fixed draw order is in this module's
 * header. Exactly two seed steps per prospective square. Also reports every
 * square whose signal changed, with its old and new signal.
 */
export function shuffleProspectiveSignals(
  nodesBefore: Readonly<Record<string, NodeStatus>>,
  nodeCount: ChargedNodeCount,
  playerMatching: PlayerMatchingSetting,
  seed: number,
): ShuffleProspectiveSignalsResult {
  const prospective = ALL_SQUARES.flatMap((square) => {
    const status = nodesBefore[squareName(square)];
    return status?.state === "prospective" && status.signal !== undefined
      ? [{ square, signalBefore: status.signal }]
      : [];
  });

  const unplaced = new Map<NodeSignal, number>();
  for (const { signalBefore } of prospective) {
    unplaced.set(signalBefore, (unplaced.get(signalBefore) ?? 0) + 1);
  }

  const signals = NODE_SIGNALS.slice(0, nodeCount);
  const phases: (readonly NodeSignal[])[] = [];
  if (playerMatching === "off") {
    phases.push(signals);
  } else {
    const matched = [
      matchedSignalForSide("red", nodeCount),
      matchedSignalForSide("green", nodeCount),
    ].sort((a, b) => a - b);
    phases.push(matched);
    phases.push(signals.filter((signal) => !matched.includes(signal)));
  }

  const nodes: Record<string, NodeStatus> = { ...nodesBefore };
  const empty = [...prospective];
  let workingSeed = seed;

  for (const phase of phases) {
    const remaining = (): number =>
      phase.reduce<number>(
        (total, signal) => total + (unplaced.get(signal) ?? 0),
        0,
      );
    while (remaining() > 0) {
      const [signalIndex, seedAfterSignal] = drawWeightedIndex(
        workingSeed,
        phase.map((signal) => unplaced.get(signal) ?? 0),
      );
      const signal = phase[signalIndex];
      const differing = empty.filter((entry) => entry.signalBefore !== signal);
      const candidates = differing.length > 0 ? differing : empty;
      const [squareIndex, seedAfterSquare] = drawIndex(
        seedAfterSignal,
        candidates.length,
      );
      const chosen = candidates[squareIndex];
      nodes[squareName(chosen.square)] = {
        state: "prospective",
        level: 0,
        signal,
      };
      empty.splice(empty.indexOf(chosen), 1);
      unplaced.set(signal, (unplaced.get(signal) ?? 0) - 1);
      workingSeed = seedAfterSquare;
    }
  }

  const recoloredSquares = prospective.flatMap(({ square, signalBefore }) => {
    const newSignal = nodes[squareName(square)].signal;
    return newSignal === undefined || newSignal === signalBefore
      ? []
      : [{ square, oldSignal: signalBefore, newSignal }];
  });

  return { nodes, nextSeed: workingSeed, recoloredSquares };
}
