// Where the board's rotators fall (rules.md §3.3): the nine 5 x 5 sections
// and the draw that places a rotator in six of them — the four corner
// sections, always, plus two more drawn from the remaining five — under the
// dedicated rotation setting only. A pure function of the squares that hold
// a node, the squares ships occupy, and a seed — used by the opening deal,
// before a `GameState` exists, and by `endOfTurn.ts`'s refill branch, whose
// caller reads those two things off its own state. Knows nothing about the
// rotation setting itself: not calling this is how continuous and planet
// spend no seed steps on rotators at all.

import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
  squareAt,
  squareName,
} from "./board";
import { isPlanet } from "./planets";
import { drawIndex } from "./random";

/** How many squares wide and tall each of the nine sections is. */
const SECTION_SIZE = BOARD_SIZE / 3;

/** One of the board's nine 5 x 5 sections: the squares it contains. */
export interface RotatorSection {
  readonly squares: readonly Square[];
}

function bandColumns(bandIndex: number): readonly string[] {
  return COLUMN_LETTERS.slice(
    bandIndex * SECTION_SIZE,
    (bandIndex + 1) * SECTION_SIZE,
  );
}

function bandRows(bandIndex: number): readonly number[] {
  return Array.from(
    { length: SECTION_SIZE },
    (_, offset) => bandIndex * SECTION_SIZE + offset + 1,
  );
}

/**
 * The board's nine sections, in the fixed order §3.3's rotators are drawn
 * in: row bands ascending (1–5, 6–10, 11–15), and within a row band, column
 * bands ascending (A–E, F–J, K–O) — the same order `ALL_SQUARES` walks the
 * board in, scaled up to sections. **This order must never change**: it is
 * the order `placeRotators` spends its seed steps in, and a recorded game
 * replays by replaying the seed.
 */
export const ROTATOR_SECTIONS: readonly RotatorSection[] = (() => {
  const sections: RotatorSection[] = [];
  for (let rowBand = 0; rowBand < 3; rowBand++) {
    const rows = new Set(bandRows(rowBand));
    for (let columnBand = 0; columnBand < 3; columnBand++) {
      const columns = new Set(bandColumns(columnBand));
      sections.push({
        squares: ALL_SQUARES.filter(
          (square) => columns.has(square.column) && rows.has(square.row),
        ),
      });
    }
  }
  return sections;
})();

function sectionIndexContaining(square: Square): number {
  const name = squareName(square);
  return ROTATOR_SECTIONS.findIndex((section) =>
    section.squares.some((candidate) => squareName(candidate) === name),
  );
}

/**
 * The four corner sections' indexes into `ROTATOR_SECTIONS`, ascending — the
 * sections holding A1, K1, A11 and K11. These always carry a rotator
 * (rules.md §3.3); named off `ROTATOR_SECTIONS` itself rather than the
 * geometry being rebuilt here.
 */
const CORNER_SECTION_INDEXES: readonly number[] = [
  squareAt("A", 1),
  squareAt("K", 1),
  squareAt("A", 11),
  squareAt("K", 11),
]
  .map(sectionIndexContaining)
  .sort((a, b) => a - b);

/**
 * The five non-corner sections' indexes into `ROTATOR_SECTIONS`, ascending:
 * the four edge sections and the middle one. Two of these carry a rotator
 * alongside the four corners.
 */
const OTHER_SECTION_INDEXES: readonly number[] = ROTATOR_SECTIONS.map(
  (_, index) => index,
).filter((index) => !CORNER_SECTION_INDEXES.includes(index));

/**
 * Draws where the board's rotators fall (rules.md §3.3): the four corner
 * sections always carry one, and two more are drawn from the remaining
 * five. Draws happen in a **fixed order**, which fixes the seed and must
 * never change:
 *
 * 1. one square, drawn uniformly from each corner section's free squares,
 *    in `ROTATOR_SECTIONS` order;
 * 2. two of the five non-corner sections, drawn without replacement (one of
 *    five, then one of the remaining four) — these two draws **always
 *    happen and always consume a seed step**, whether or not the sections
 *    they land on turn out to have a free square, which is what keeps the
 *    stream predictable;
 * 3. one square, drawn uniformly from each of those two sections' free
 *    squares, in `ROTATOR_SECTIONS` order.
 *
 * A section's free squares exclude any square holding a planet, a ship or a
 * node in any state. A section with no free square yields no rotator for
 * that section and **consumes no seed step** for its own square draw, so a
 * board can carry fewer than six.
 *
 * Returns the drawn squares in board order (the order `ALL_SQUARES` walks,
 * the same order `nodeSquares` returns its squares in) even though the
 * draws themselves walk sections — the two orders are deliberately
 * different, one fixing the seed and the other matching how the state
 * stores its squares. At most eight seed steps: two section draws plus at
 * most six square draws.
 */
export function placeRotators(
  nodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
): [rotators: readonly Square[], nextSeed: number] {
  const nodeNames = new Set(nodeSquares.map(squareName));
  const shipNames = new Set(shipSquares.map(squareName));

  function freeSquares(section: RotatorSection): readonly Square[] {
    return section.squares.filter((square) => {
      const name = squareName(square);
      return !nodeNames.has(name) && !shipNames.has(name) && !isPlanet(square);
    });
  }

  const drawnNames = new Set<string>();
  let workingSeed = seed;

  function drawFromSection(sectionIndex: number): void {
    const free = freeSquares(ROTATOR_SECTIONS[sectionIndex]);
    if (free.length === 0) {
      return;
    }
    const [squareIndex, nextSeed] = drawIndex(workingSeed, free.length);
    drawnNames.add(squareName(free[squareIndex]));
    workingSeed = nextSeed;
  }

  for (const sectionIndex of CORNER_SECTION_INDEXES) {
    drawFromSection(sectionIndex);
  }

  const remainingIndexes = [...OTHER_SECTION_INDEXES];
  const [firstPick, seedAfterFirstPick] = drawIndex(
    workingSeed,
    remainingIndexes.length,
  );
  const firstChosenIndex = remainingIndexes.splice(firstPick, 1)[0];
  workingSeed = seedAfterFirstPick;

  const [secondPick, seedAfterSecondPick] = drawIndex(
    workingSeed,
    remainingIndexes.length,
  );
  const secondChosenIndex = remainingIndexes[secondPick];
  workingSeed = seedAfterSecondPick;

  for (const sectionIndex of [firstChosenIndex, secondChosenIndex].sort(
    (a, b) => a - b,
  )) {
    drawFromSection(sectionIndex);
  }

  const rotators = ALL_SQUARES.filter((square) =>
    drawnNames.has(squareName(square)),
  );

  return [rotators, workingSeed];
}
