// Confirms the property rules.md §3.2 actually requires: no single legal
// move can touch two sites. The move ranges below are §6's ranges,
// transcribed here only for this sweep - movement itself is out of scope
// for this story, so no movement module exists in src/rules/.
import { describe, expect, it } from "vitest";
import {
  ALL_SQUARES,
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";
import { SITES } from "./sites";

/** §6: orthogonal reach at 0 shields is 1, 2 or 3 squares. */
const ORTHOGONAL_LENGTHS = [1, 2, 3];
/** §6: diagonal reach at 0 shields is 1 or 2 squares. */
const DIAGONAL_LENGTHS = [1, 2];

const ORTHOGONAL_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const SITE_NAMES: ReadonlySet<string> = new Set(SITES.map(squareName));

interface Move {
  readonly origin: Square;
  readonly direction: readonly [number, number];
  readonly length: number;
  /** Squares passed over and landed on, excluding the origin. */
  readonly touched: readonly Square[];
}

/**
 * Every legal 0-shield move from every square on the board, per §6. The
 * 0-shield case is the worst case: every move available with shields is
 * also available at 0. Moves that would leave the board are omitted.
 */
function allMoves(): readonly Move[] {
  const moves: Move[] = [];

  for (const origin of ALL_SQUARES) {
    const originColumnIndex = COLUMN_LETTERS.indexOf(origin.column);

    const directionSets: ReadonlyArray<
      readonly [ReadonlyArray<readonly [number, number]>, readonly number[]]
    > = [
      [ORTHOGONAL_DIRECTIONS, ORTHOGONAL_LENGTHS],
      [DIAGONAL_DIRECTIONS, DIAGONAL_LENGTHS],
    ];

    for (const [directions, lengths] of directionSets) {
      for (const direction of directions) {
        for (const length of lengths) {
          const touched: Square[] = [];
          let offBoard = false;

          for (let step = 1; step <= length; step++) {
            const columnIndex = originColumnIndex + direction[0] * step;
            const row = origin.row + direction[1] * step;
            const column = COLUMN_LETTERS[columnIndex];

            if (column === undefined || !isOnBoard(column, row)) {
              offBoard = true;
              break;
            }
            touched.push(squareAt(column, row));
          }

          if (!offBoard) {
            moves.push({ origin, direction, length, touched });
          }
        }
      }
    }
  }

  return moves;
}

function sitesTouchedBy(move: Move): readonly string[] {
  return move.touched.map(squareName).filter((name) => SITE_NAMES.has(name));
}

describe("site spacing", () => {
  it("has no legal move that touches two or more sites", () => {
    const moves = allMoves();
    expect(moves.length).toBeGreaterThan(0);

    const failures: string[] = [];

    for (const move of moves) {
      const touchedSites = sitesTouchedBy(move);
      if (touchedSites.length >= 2) {
        failures.push(
          `${squareName(move.origin)} moving ${move.direction[0]},${move.direction[1]} ` +
            `for ${move.length} touches sites ${touchedSites.join(", ")}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
