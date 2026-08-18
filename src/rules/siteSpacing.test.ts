// Confirms the property rules.md §3.2 actually requires: no single legal
// move can touch two sites. Enumerates every §6 move at 0 shields, the
// worst case, since every move available with shields is also available
// at 0.
import { describe, expect, it } from "vitest";
import { ALL_SQUARES, COLUMN_LETTERS, type Square, squareName } from "./board";
import { isBay } from "./bays";
import { reachFrom } from "./movement";
import { SITES } from "./sites";

const SITE_NAMES: ReadonlySet<string> = new Set(SITES.map(squareName));

interface Move {
  readonly origin: Square;
  readonly direction: readonly [number, number];
  readonly length: number;
  /** Squares passed over and landed on, excluding the origin. */
  readonly touched: readonly Square[];
}

/**
 * Every legal 0-shield move from every square on the board, per §6.
 */
function allMoves(): readonly Move[] {
  const moves: Move[] = [];

  for (const origin of ALL_SQUARES) {
    const originColumnIndex = COLUMN_LETTERS.indexOf(origin.column);

    for (const entry of reachFrom(origin, 0)) {
      const length = entry.passedOver.length + 1;
      const destinationColumnIndex = COLUMN_LETTERS.indexOf(
        entry.destination.column,
      );
      const direction: readonly [number, number] = [
        (destinationColumnIndex - originColumnIndex) / length,
        (entry.destination.row - origin.row) / length,
      ];

      moves.push({
        origin,
        direction,
        length,
        touched: [...entry.passedOver, entry.destination],
      });
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

  it("noMoveBothChargesAndEndsInABay: no legal move touches a site and ends in a bay", () => {
    // src/board/announcements.ts's moveSentence announces a move ending in a
    // bay before it looks for a site charged en route, so a move doing both
    // would silently drop the charge from the sentence. This guards the
    // assumption that no legal move on this board can do both.
    const moves = allMoves();
    expect(moves.length).toBeGreaterThan(0);

    const failures: string[] = [];

    for (const move of moves) {
      if (isBay(move.touched[move.touched.length - 1])) {
        const touchedSites = sitesTouchedBy(move);
        if (touchedSites.length > 0) {
          failures.push(
            `${squareName(move.origin)} moving ${move.direction[0]},${move.direction[1]} ` +
              `for ${move.length} touches site(s) ${touchedSites.join(", ")} and ends in a bay`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
