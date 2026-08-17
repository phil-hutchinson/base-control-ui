// Movement (rules.md §6): a ship moves in a straight line, orthogonally or
// diagonally, as far as its shield count allows. This module holds the
// reach half only — the shape of a ship's move from an otherwise empty
// board. It knows nothing about ships, occupancy, sites or whose turn it
// is; legality is layered on top elsewhere.

import { COLUMN_LETTERS, type Square, isOnBoard, squareAt } from "./board";
import type { ShieldCount } from "./shields";

type DirectionKind = "orthogonal" | "diagonal";

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

function directionsFor(
  kind: DirectionKind,
): ReadonlyArray<readonly [number, number]> {
  return kind === "orthogonal" ? ORTHOGONAL_DIRECTIONS : DIAGONAL_DIRECTIONS;
}

interface ReachOption {
  /** The shield count at which this option unlocks. A ship keeps every option whose figure is at or above its own shield count. */
  readonly unlockedAtShields: ShieldCount;
  readonly kind: DirectionKind;
  readonly distance: number;
}

/** §6's range table, transcribed row for row. */
const REACH_OPTIONS: readonly ReachOption[] = [
  { unlockedAtShields: 4, kind: "orthogonal", distance: 1 },
  { unlockedAtShields: 3, kind: "diagonal", distance: 1 },
  { unlockedAtShields: 2, kind: "orthogonal", distance: 2 },
  { unlockedAtShields: 1, kind: "diagonal", distance: 2 },
  { unlockedAtShields: 0, kind: "orthogonal", distance: 3 },
];

/**
 * One square a ship could move to: the destination, and the squares passed
 * over on the way there, in order, excluding both the origin and the
 * destination.
 */
export interface ReachEntry {
  readonly destination: Square;
  readonly passedOver: readonly Square[];
}

/**
 * Every square a ship at `origin` carrying `shields` could move to on an
 * otherwise empty board (rules.md §6). Moves that would leave the board are
 * omitted entirely. Says nothing about occupancy, sites or whose turn it is.
 */
export function reachFrom(
  origin: Square,
  shields: ShieldCount,
): readonly ReachEntry[] {
  const originColumnIndex = COLUMN_LETTERS.indexOf(origin.column);
  const entries: ReachEntry[] = [];

  for (const option of REACH_OPTIONS) {
    if (option.unlockedAtShields < shields) {
      continue;
    }

    for (const [deltaColumn, deltaRow] of directionsFor(option.kind)) {
      const path: Square[] = [];
      let offBoard = false;

      for (let step = 1; step <= option.distance; step++) {
        const columnIndex = originColumnIndex + deltaColumn * step;
        const row = origin.row + deltaRow * step;
        const column = COLUMN_LETTERS[columnIndex];

        if (column === undefined || !isOnBoard(column, row)) {
          offBoard = true;
          break;
        }
        path.push(squareAt(column, row));
      }

      if (!offBoard) {
        entries.push({
          destination: path[path.length - 1],
          passedOver: path.slice(0, -1),
        });
      }
    }
  }

  return entries;
}
