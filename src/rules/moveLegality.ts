// §6-only move legality (rules.md §6): whether a destination is legal for a
// ship judged by reach, occupancy and the destination site's state alone,
// with no awareness of §8.5's stranded-ship obligation. `stranded.ts` uses
// this half to ask "does this ship have a legal move" without asking "does
// the obligation apply to this ship", which would be circular; the public
// functions in `movement.ts` are built on top of it for every other caller.

import {
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";
import type { ShipId } from "./fleet";
import {
  type GameState,
  type Ship,
  shipsBySquare,
  siteStateAt,
} from "./gameState";
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
 * omitted entirely. Says nothing about occupancy, sites or whose ply it is.
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

/**
 * The structured reasons a square is not a legal destination for a ship.
 * Never a sentence — the wording for these lives in `src/board/`.
 */
export type MoveRefusalReason =
  | "not-your-ship"
  | "ship-already-moved"
  | "another-ship-stranded"
  | "out-of-range"
  | "path-blocked"
  | "destination-occupied"
  | "destination-dormant-site"
  | "destination-depleted-site"
  | "game-over";

/** The ship with the given id in this state, or throws if there is none. */
export function findShip(state: GameState, shipId: ShipId): Ship {
  const ship = state.ships.find((candidate) => candidate.id === shipId);
  if (ship === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  return ship;
}

/**
 * Why `destination` is not a legal move for `shipId` in the given state,
 * under §6 alone: whose ship it is, whether it has already moved, its reach,
 * occupancy along the way, and the destination site's state. Says nothing
 * about §8.5's stranded-ship obligation — `movement.ts` layers that on top
 * for the public `moveRefusalReason`.
 */
export function sixOnlyMoveRefusalReason(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): MoveRefusalReason | undefined {
  const ship = findShip(state, shipId);

  if (ship.side !== state.sideToMove) {
    return "not-your-ship";
  }
  if (state.movedThisPly.includes(shipId)) {
    return "ship-already-moved";
  }

  const destinationName = squareName(destination);
  const entry = reachFrom(ship.square, ship.shields).find(
    (candidate) => squareName(candidate.destination) === destinationName,
  );
  if (entry === undefined) {
    return "out-of-range";
  }

  const occupied = shipsBySquare(state);
  if (entry.passedOver.some((square) => occupied.has(squareName(square)))) {
    return "path-blocked";
  }
  if (occupied.has(destinationName)) {
    return "destination-occupied";
  }

  const siteState = siteStateAt(state, destination);
  if (siteState === "dormant") {
    return "destination-dormant-site";
  }
  if (siteState === "depleted") {
    return "destination-depleted-site";
  }

  return undefined;
}

/**
 * Every square `shipId` may legally move to in the given state under §6
 * alone, ignoring §8.5's stranded-ship obligation. The §6-only counterpart to
 * the public `legalDestinations` in `movement.ts`; see
 * `sixOnlyMoveRefusalReason` for why it exists.
 */
export function sixOnlyLegalDestinations(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  const ship = findShip(state, shipId);
  if (ship.side !== state.sideToMove || state.movedThisPly.includes(shipId)) {
    return [];
  }

  return reachFrom(ship.square, ship.shields)
    .map((entry) => entry.destination)
    .filter(
      (destination) =>
        sixOnlyMoveRefusalReason(state, shipId, destination) === undefined,
    );
}
