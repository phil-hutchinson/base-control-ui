// A long-run measurement test for steal's prospective-square draw (steal.md
// §6, §7), in the style of `nodePool.test.ts`: it re-measures the placement
// figures, split into the opening deal — which now draws its second square
// from the strict pool first (steal.md §7) — and mid-game draws, a claim's
// or an abandon's fresh square, which are the ones the widened pool and the
// outer-edge halving actually shape. It also proves that rules.md §3.2's own
// fallback never fires even at the largest fleet and five nodes — the worst
// case for available squares, since that combination blocks the most of the
// board.
//
// The re-measured figures below come from an improvised measurement script
// run against this code, at the default fleet of five a side, not committed
// here. Both sets are recorded in doc/ruleset/tech-notes.md, "Placing
// prospective nodes under steal".

import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareFromName,
  squareName,
} from "./board";
import { DEFAULT_FLEET_SIZE, FLEET_SIZES, type ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, startingGameState } from "./gameState";
import { legalDestinations } from "./movement";
import { PLANETS, isPlanet } from "./planets";
import { legalTargets } from "./combat";
import { NODE_SIGNALS, type NodeSignal, squaresForSignal } from "./steal";
import { applyAttack, applyMove, applyPassGuard } from "./ply";
import { CHARGED_NODE_COUNTS } from "./nodes";

/** How many opening deals the distance-band measurement draws per node count — enough to be stable, quick enough to stay well under ten seconds. */
const TYPICAL_DEALS = 2_000;

/** How many opening deals the outer-two-rings check draws per node count and fleet size. */
const OUTER_RINGS_DEALS = 300;

/**
 * The mean distance between a node's two opening squares, at each node
 * count, re-measured at the app's default fleet of five a side (see this
 * file's header). The band below leaves generous margin either side, since
 * this file samples far fewer deals than the script that measured it.
 */
const OPENING_FIGURES: Readonly<Record<3 | 4 | 5, number>> = {
  3: 5.47,
  4: 5.52,
  5: 5.53,
};

const OPENING_DISTANCE_TOLERANCE = 1.0;

/**
 * The mean distance, and the outer-edge share, of every claim's and
 * abandon's fresh prospective square during play — the widened pool and the
 * outer-edge halving's own draw — re-measured at five nodes, the app's
 * default fleet. See doc/ruleset/tech-notes.md, "Placing prospective nodes
 * under steal".
 */
const MID_GAME_FIGURES = { meanDistance: 7.88, edgeShare: 0.27 };
const MID_GAME_DISTANCE_TOLERANCE = 1.5;
const MID_GAME_EDGE_SHARE_TOLERANCE = 0.12;

function columnIndex(square: Square): number {
  return COLUMN_LETTERS.indexOf(square.column);
}

/** How many rings in from the nearest edge a square sits: 0 on the outer edge, 1 one square in, and so on — the same measure `nodePlacement.ts` uses. */
function distanceFromEdge(square: Square): number {
  const colIndex = columnIndex(square);
  const columnDistance = Math.min(
    colIndex,
    COLUMN_LETTERS.length - 1 - colIndex,
  );
  const rowDistance = Math.min(square.row - 1, BOARD_SIZE - square.row);
  return Math.min(columnDistance, rowDistance);
}

function isOuterEdge(square: Square): boolean {
  return distanceFromEdge(square) === 0;
}

/** The strict pool's interior — two rings in from the edge or deeper (rules.md §3.2's constraints 3 and 4). */
function isStrictInterior(square: Square): boolean {
  return distanceFromEdge(square) >= 2;
}

/** The outer two rings the strict pool excludes (rows 1, 2, 14, 15 and columns A, B, N, O) — the opening deal's second square keeps off these except as a last resort (steal.md §7). */
function isOuterTwoRings(square: Square): boolean {
  return !isStrictInterior(square);
}

function isAdjacent(a: Square, b: Square): boolean {
  return chebyshevDistance(a, b) <= 1;
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Independently checks `square` against every one of §3.2's six ordinary
 * constraints — reimplemented here rather than delegating to
 * `legalNodePool`, so this test does not simply trust the function it is
 * meant to be checking. A square that clears every constraint could not
 * have come from the fallback: the fallback only ever fires when no square
 * anywhere clears them all, which this square, by clearing them, disproves
 * (mirrors `nodePool.test.ts`'s own argument).
 */
function satisfiesOrdinaryPoolConstraints(
  square: Square,
  occupiedSquares: readonly Square[],
  shipSquares: readonly Square[],
  widened: boolean,
): boolean {
  const requiredRings = widened ? 0 : 2;
  const name = squareName(square);

  if (occupiedSquares.some((occupied) => squareName(occupied) === name)) {
    return false;
  }
  if (shipSquares.some((ship) => squareName(ship) === name)) {
    return false;
  }
  if (distanceFromEdge(square) < requiredRings) {
    return false;
  }
  if (occupiedSquares.some((occupied) => isAdjacent(square, occupied))) {
    return false;
  }
  if (isPlanet(square)) {
    return false;
  }
  if (PLANETS.some((planet) => isAdjacent(square, planet))) {
    return false;
  }
  return true;
}

describe.each(CHARGED_NODE_COUNTS)(
  "the steal opening deal's placement figures at %d nodes, the app's default fleet (steal.md §6, §7)",
  (chargedNodeCount) => {
    it("keeps the mean distance between a node's two opening squares within a band around the re-measured figure, with both squares inside the strict interior", () => {
      const figure = OPENING_FIGURES[chargedNodeCount as 3 | 4 | 5];
      const distances: number[] = [];

      for (let i = 0; i < TYPICAL_DEALS; i++) {
        const seed = 30_000_000 + chargedNodeCount * 1_000_000 + i;
        const state = startingGameState(seed, {
          chargedNodeCount,
          fleetSize: DEFAULT_FLEET_SIZE,
          nodePlaystyle: "steal",
          lengthInRounds: 40,
        });

        for (const signal of NODE_SIGNALS.slice(
          0,
          chargedNodeCount,
        ) as readonly NodeSignal[]) {
          const squares = squaresForSignal(state.nodes, signal);
          expect(squares).toHaveLength(2);
          const [a, b] = squares;

          distances.push(chebyshevDistance(a, b));
          // Both the first square (always drawn from the strict pool) and
          // the second (steal.md §7's own strict-first draw) sit in the
          // strict interior at the default fleet — the outer-two-rings
          // block below checks this holds at every fleet size too.
          expect(isStrictInterior(a)).toBe(true);
          expect(isStrictInterior(b)).toBe(true);
        }
      }

      const meanDistance = average(distances);

      expect(meanDistance).toBeGreaterThan(figure - OPENING_DISTANCE_TOLERANCE);
      expect(meanDistance).toBeLessThan(figure + OPENING_DISTANCE_TOLERANCE);
    }, 30_000);
  },
);

describe.each(CHARGED_NODE_COUNTS)(
  "the steal opening deal never lands a square in the outer two rings, at %d nodes (steal.md §7)",
  (chargedNodeCount) => {
    it.each(FLEET_SIZES)(
      "at fleet size %d a side",
      (fleetSize) => {
        for (let i = 0; i < OUTER_RINGS_DEALS; i++) {
          const seed =
            60_000_000 + chargedNodeCount * 4_000_000 + fleetSize * 100_000 + i;
          const state = startingGameState(seed, {
            chargedNodeCount,
            fleetSize,
            nodePlaystyle: "steal",
            lengthInRounds: 40,
          });

          for (const signal of NODE_SIGNALS.slice(
            0,
            chargedNodeCount,
          ) as readonly NodeSignal[]) {
            const [a, b] = squaresForSignal(state.nodes, signal);
            expect(isOuterTwoRings(a)).toBe(false);
            expect(isOuterTwoRings(b)).toBe(false);
          }
        }
      },
      30_000,
    );
  },
);

describe("the fallback never fires, at the largest fleet and five nodes — the worst case for available squares", () => {
  const WORST_CASE_DEALS = 2_000;

  it("deals every opening square legally, with no square ever needing the fallback", () => {
    for (let i = 0; i < WORST_CASE_DEALS; i++) {
      const seed = 40_000_000 + i;
      const state = startingGameState(seed, {
        chargedNodeCount: 5,
        fleetSize: 6,
        nodePlaystyle: "steal",
        lengthInRounds: 40,
      });
      const shipSquares = state.ships.map((ship) => ship.square);

      for (const signal of NODE_SIGNALS as readonly NodeSignal[]) {
        const squares = squaresForSignal(state.nodes, signal);
        expect(squares).toHaveLength(2);
        const [a, b] = squares;

        for (const square of squares) {
          const otherSquares = ([a, b] as readonly Square[]).filter(
            (candidate) => squareName(candidate) !== squareName(square),
          );
          const everyOtherNodeSquare = NODE_SIGNALS.filter(
            (other) => other !== signal,
          ).flatMap((other) => squaresForSignal(state.nodes, other));
          expect(
            satisfiesOrdinaryPoolConstraints(
              square,
              [...otherSquares, ...everyOtherNodeSquare],
              shipSquares,
              true,
            ),
          ).toBe(true);
        }
      }
    }
  }, 30_000);
});

/** One ship's identity and side, for the local greedy policy below. */
interface PlyChoiceMove {
  readonly kind: "move";
  readonly shipId: ShipId;
  readonly destination: Square;
}
interface PlyChoiceAttack {
  readonly kind: "attack";
  readonly shipId: ShipId;
  readonly target: Square;
}
type StealPlacementPlyChoice = PlyChoiceMove | PlyChoiceAttack;

function distanceToNearestProspective(
  state: GameState,
  square: Square,
): number {
  let nearest = Infinity;
  for (const [name, status] of Object.entries(state.nodes)) {
    if (status.state !== "prospective") {
      continue;
    }
    const distance = chebyshevDistance(square, squareFromName(name));
    if (distance < nearest) {
      nearest = distance;
    }
  }
  return nearest;
}

/** Attacks first, then heads for the nearest prospective node, exactly as `seededReplay.test.ts`'s steal policy does — kept local so this file depends on nothing but the public rules API. */
function chooseStealPlacementPly(
  state: GameState,
): StealPlacementPlyChoice | undefined {
  for (const ship of state.ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  for (const ship of state.ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (state.nodes[squareName(destination)]?.state === "prospective") {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  let best:
    { shipId: ShipId; destination: Square; improvement: number } | undefined;
  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length === 0) {
      continue;
    }
    const fromDistance = distanceToNearestProspective(state, ship.square);
    for (const destination of destinations) {
      const toDistance = distanceToNearestProspective(state, destination);
      const improvement = fromDistance - toDistance;
      if (best === undefined || improvement > best.improvement) {
        best = { shipId: ship.id, destination, improvement };
      }
    }
  }
  return best === undefined
    ? undefined
    : { kind: "move", shipId: best.shipId, destination: best.destination };
}

describe("the steal claim and abandon draws' placement figures, at 5 nodes, the app's default fleet (steal.md §6)", () => {
  const MID_GAME_MAX_PLIES = 2_000;
  const MID_GAME_SEEDS = [
    70260819, 70260820, 70260821, 70260822, 70260823, 70260824, 70260825,
    70260826, 70260827, 70260828,
  ];

  it("keeps the mean distance and the outer-edge share of every claim's and abandon's fresh square within a band around the re-measured figures", () => {
    const distances: number[] = [];
    let onEdgeCount = 0;
    let total = 0;

    for (const seed of MID_GAME_SEEDS) {
      let state = startingGameState(seed, {
        chargedNodeCount: 5,
        fleetSize: DEFAULT_FLEET_SIZE,
        nodePlaystyle: "steal",
        lengthInRounds: 90,
      });

      let pliesApplied = 0;
      while (!isGameOver(state) && pliesApplied < MID_GAME_MAX_PLIES) {
        pliesApplied += 1;
        const choice = chooseStealPlacementPly(state);

        if (choice === undefined) {
          const { state: nextState } = applyPassGuard(state);
          state = nextState;
          continue;
        }

        const result =
          choice.kind === "attack"
            ? applyAttack(state, choice.shipId, choice.target)
            : applyMove(state, choice.shipId, choice.destination);

        if (result.outcome !== "applied") {
          throw new Error(
            `policy chose an illegal ${choice.kind}: ${result.reason}`,
          );
        }
        state = result.state;

        for (const effect of result.effects) {
          if (
            effect.type !== "node-claimed" &&
            effect.type !== "node-abandoned"
          ) {
            continue;
          }
          total += 1;
          if (isOuterEdge(effect.newProspective)) {
            onEdgeCount += 1;
          }
          // A claim's anchor is the square just charged; an abandon's is
          // the node's one remaining square (steal.md §6).
          const anchorSquare =
            effect.type === "node-claimed"
              ? effect.square
              : squaresForSignal(state.nodes, effect.signal).find(
                  (square) =>
                    squareName(square) !== squareName(effect.newProspective),
                );
          if (anchorSquare !== undefined) {
            distances.push(
              chebyshevDistance(anchorSquare, effect.newProspective),
            );
          }
        }
      }
    }

    expect(total).toBeGreaterThan(50);
    const meanDistance = average(distances);
    const edgeShare = onEdgeCount / total;

    expect(meanDistance).toBeGreaterThan(
      MID_GAME_FIGURES.meanDistance - MID_GAME_DISTANCE_TOLERANCE,
    );
    expect(meanDistance).toBeLessThan(
      MID_GAME_FIGURES.meanDistance + MID_GAME_DISTANCE_TOLERANCE,
    );
    expect(edgeShare).toBeGreaterThan(
      MID_GAME_FIGURES.edgeShare - MID_GAME_EDGE_SHARE_TOLERANCE,
    );
    expect(edgeShare).toBeLessThan(
      MID_GAME_FIGURES.edgeShare + MID_GAME_EDGE_SHARE_TOLERANCE,
    );
  }, 30_000);
});

describe("the fallback never fires during play either, at the largest fleet and five nodes", () => {
  const MAX_PLIES = 2_000;
  const SEEDS = [50260819, 50260820, 50260821];

  it("never draws a claim's or an abandon's fresh prospective square outside the ordinary widened pool", () => {
    let fallbackWouldHaveFired = false;
    let eventsChecked = 0;

    for (const seed of SEEDS) {
      let state = startingGameState(seed, {
        chargedNodeCount: 5,
        fleetSize: 6,
        nodePlaystyle: "steal",
        lengthInRounds: 90,
      });

      let pliesApplied = 0;
      while (!isGameOver(state) && pliesApplied < MAX_PLIES) {
        pliesApplied += 1;
        const choice = chooseStealPlacementPly(state);

        if (choice === undefined) {
          const { state: nextState } = applyPassGuard(state);
          state = nextState;
          continue;
        }

        const result =
          choice.kind === "attack"
            ? applyAttack(state, choice.shipId, choice.target)
            : applyMove(state, choice.shipId, choice.destination);

        if (result.outcome !== "applied") {
          throw new Error(
            `policy chose an illegal ${choice.kind}: ${result.reason}`,
          );
        }
        state = result.state;

        for (const effect of result.effects) {
          if (
            effect.type !== "node-claimed" &&
            effect.type !== "node-abandoned"
          ) {
            continue;
          }
          eventsChecked += 1;
          const shipSquares = state.ships.map((ship) => ship.square);
          const otherNodeSquares = NODE_SIGNALS.filter(
            (signal) => signal !== effect.signal,
          ).flatMap((signal) => squaresForSignal(state.nodes, signal));
          const sameSignalOtherSquare = squaresForSignal(
            state.nodes,
            effect.signal,
          ).filter(
            (square) =>
              squareName(square) !== squareName(effect.newProspective),
          );

          if (
            !satisfiesOrdinaryPoolConstraints(
              effect.newProspective,
              [...otherNodeSquares, ...sameSignalOtherSquare],
              shipSquares,
              true,
            )
          ) {
            fallbackWouldHaveFired = true;
          }
        }
      }
    }

    // Recorded rather than assumed: across every claim and abandon these
    // seeds played, the fallback never fired (`fallbackWouldHaveFired`
    // stays false) — the same finding `tech-notes.md`'s new section states.
    expect(eventsChecked).toBeGreaterThan(20);
    expect(fallbackWouldHaveFired).toBe(false);
  }, 30_000);
});
