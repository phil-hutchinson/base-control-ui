// A long-run measurement test for steal's prospective-square draw (steal.md
// §6), in the style of `nodePool.test.ts`: it re-measures story.md's
// placement figures at the app's default fleet of five a side, and proves
// separately that rules.md §3.2's fallback never fires even at the largest
// fleet and five nodes — the worst case for available squares, since that
// combination blocks the most of the board.
//
// The re-measured figures below (mean distance between a node's two
// squares, and the share of second squares landing on the outer edge, at
// three, four and five nodes) come from an improvised 20,000-deal-per-count
// script run against this code, at the default fleet of five a side, not
// committed here (doc/plan/00000101-add-node-steal-play-variant,
// implementation-plan.md, Step 6). They replace story.md's own figures,
// which were measured before the draw existed; both are recorded in
// doc/ruleset/tech-notes.md, "Placing prospective nodes under steal".

import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  chebyshevDistance,
  squareFromName,
  squareName,
} from "./board";
import { DEFAULT_FLEET_SIZE, type ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, startingGameState } from "./gameState";
import { legalDestinations } from "./movement";
import { PLANETS, isPlanet } from "./planets";
import { legalTargets } from "./combat";
import { NODE_SIGNALS, type NodeSignal, squaresForSignal } from "./steal";
import { applyAttack, applyMove, applyPassGuard } from "./ply";
import { CHARGED_NODE_COUNTS } from "./nodes";

/** How many opening deals the typical-figures measurement draws per node count — enough to be stable, quick enough to stay well under ten seconds. */
const TYPICAL_DEALS = 2_000;

/**
 * The mean distance between a node's two squares, and the share of second
 * squares on the outer edge, at each node count, re-measured over 20,000
 * deals per count at the app's default fleet of five a side (see this
 * file's header). The bands below leave generous margin either side, since
 * this file samples far fewer deals than the script that measured them.
 */
const RE_MEASURED_FIGURES: Readonly<
  Record<
    3 | 4 | 5,
    { readonly meanDistance: number; readonly edgeShare: number }
  >
> = {
  3: { meanDistance: 6.73, edgeShare: 0.235 },
  4: { meanDistance: 6.82, edgeShare: 0.249 },
  5: { meanDistance: 6.91, edgeShare: 0.263 },
};

const DISTANCE_TOLERANCE = 1.2;
const EDGE_SHARE_TOLERANCE = 0.1;

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
    it("keeps the mean distance between a node's two squares, and the share landing on the outer edge, within a band around the re-measured figures, with every node's other square inside the strict interior", () => {
      const figures = RE_MEASURED_FIGURES[chargedNodeCount as 3 | 4 | 5];
      const distances: number[] = [];
      let onEdgeCount = 0;
      let pairs = 0;

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
          pairs += 1;
          if (isOuterEdge(a) || isOuterEdge(b)) {
            onEdgeCount += 1;
          }
          // The first square dealt for every signal is always drawn from
          // the strict pool (steal.md §7): whichever of the two squares
          // this is, at least one must sit in the strict interior.
          expect(isStrictInterior(a) || isStrictInterior(b)).toBe(true);
        }
      }

      const meanDistance = average(distances);
      const edgeShare = onEdgeCount / pairs;

      expect(meanDistance).toBeGreaterThan(
        figures.meanDistance - DISTANCE_TOLERANCE,
      );
      expect(meanDistance).toBeLessThan(
        figures.meanDistance + DISTANCE_TOLERANCE,
      );
      expect(edgeShare).toBeGreaterThan(
        figures.edgeShare - EDGE_SHARE_TOLERANCE,
      );
      expect(edgeShare).toBeLessThan(figures.edgeShare + EDGE_SHARE_TOLERANCE);
    });
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
  });
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
  });
});
