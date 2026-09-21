// The deal of bonus planets (rules.md §3.4): three distinct planets a side,
// drawn at random from the twelve, the two sides' draws independent so their
// sets may overlap. A pure function of a seed, used once by the opening
// deal, before a `GameState` exists — its caller reads what it needs off its
// own state, exactly the arrangement `rotators.ts`'s `placeRotators` has.
// Knows nothing about the planet bonus setting itself: not calling this is
// how an off game spends no seed steps on a deal at all.
//
// **Draw order is fixed and must never change: green's three, then red's,
// each side's three drawn one at a time without replacement.** Exactly six
// seed steps are consumed. This is what lets a recorded game deal
// identically on replay.

import { ALL_SQUARES, type Square, squareName } from "./board";
import type { Side } from "./fleet";
import { PLANETS } from "./planets";
import { drawIndex } from "./random";

const BOARD_ORDER_INDEX: ReadonlyMap<string, number> = new Map(
  ALL_SQUARES.map((square, index) => [squareName(square), index]),
);

/** Sorts squares into board order (the order `ALL_SQUARES` walks the board in). */
function sortByBoardOrder(squares: readonly Square[]): readonly Square[] {
  return [...squares].sort(
    (a, b) =>
      BOARD_ORDER_INDEX.get(squareName(a))! -
      BOARD_ORDER_INDEX.get(squareName(b))!,
  );
}

/**
 * Draws three distinct planets, one at a time without replacement, from a
 * seed. Returns the three drawn (in draw order, not yet sorted) and the seed
 * left behind.
 */
function drawThreeDistinctPlanets(
  seed: number,
): [planets: readonly Square[], nextSeed: number] {
  const pool = [...PLANETS];
  const drawn: Square[] = [];
  let workingSeed = seed;
  for (let count = 0; count < 3; count++) {
    const [poolIndex, nextSeed] = drawIndex(workingSeed, pool.length);
    drawn.push(pool.splice(poolIndex, 1)[0]);
    workingSeed = nextSeed;
  }
  return [drawn, workingSeed];
}

/**
 * Deals both sides' three bonus planets (rules.md §3.4) from a seed: green's
 * three, then red's, each side's draw independent of the other's, so the two
 * sets may overlap in any number from none to all three. Each side's three
 * come back distinct and in board order. Consumes exactly six seed steps.
 */
export function dealBonusPlanets(
  seed: number,
): [bySide: Readonly<Record<Side, readonly Square[]>>, nextSeed: number] {
  const [greenPlanets, seedAfterGreen] = drawThreeDistinctPlanets(seed);
  const [redPlanets, seedAfterRed] = drawThreeDistinctPlanets(seedAfterGreen);
  return [
    {
      green: sortByBoardOrder(greenPlanets),
      red: sortByBoardOrder(redPlanets),
    },
    seedAfterRed,
  ];
}
