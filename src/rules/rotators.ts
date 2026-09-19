// Where the board's rotators fall (rules.md §3.3): the nine 5 x 5 sections
// and the draw that places one rotator in each, under the dedicated
// rotation setting only. A pure function of the squares that hold a node,
// the squares ships occupy, and a seed — used by the opening deal, before a
// `GameState` exists, and by `endOfTurn.ts`'s refill branch, whose caller
// reads those two things off its own state. Knows nothing about the
// rotation setting itself: not calling this is how continuous and planet
// spend no seed steps on rotators at all.

import {
  ALL_SQUARES,
  BOARD_SIZE,
  COLUMN_LETTERS,
  type Square,
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

/**
 * Draws where the board's rotators fall (rules.md §3.3): walks
 * `ROTATOR_SECTIONS` in order and draws **one square uniformly** from each
 * section's free squares — no planet, no ship and no node in any state.
 * A section with no free square yields no rotator for that section and
 * **consumes no seed step**, so a board can carry fewer than nine.
 *
 * Returns the drawn squares in board order (the order `ALL_SQUARES` walks,
 * the same order `nodeSquares` returns its squares in) even though the
 * draws themselves walk sections — the two orders are deliberately
 * different, one fixing the seed and the other matching how the state
 * stores its squares. At most nine seed steps.
 */
export function placeRotators(
  nodeSquares: readonly Square[],
  shipSquares: readonly Square[],
  seed: number,
): [rotators: readonly Square[], nextSeed: number] {
  const nodeNames = new Set(nodeSquares.map(squareName));
  const shipNames = new Set(shipSquares.map(squareName));

  const drawnNames = new Set<string>();
  let workingSeed = seed;

  for (const section of ROTATOR_SECTIONS) {
    const free = section.squares.filter((square) => {
      const name = squareName(square);
      return !nodeNames.has(name) && !shipNames.has(name) && !isPlanet(square);
    });
    if (free.length === 0) {
      continue;
    }
    const [index, nextSeed] = drawIndex(workingSeed, free.length);
    drawnNames.add(squareName(free[index]));
    workingSeed = nextSeed;
  }

  const rotators = ALL_SQUARES.filter((square) =>
    drawnNames.has(squareName(square)),
  );

  return [rotators, workingSeed];
}
