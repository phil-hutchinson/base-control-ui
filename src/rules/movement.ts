// Movement (rules.md §6): a ship moves in a straight line, orthogonally or
// diagonally, as far as its shield count allows. This module holds both
// halves of §6: reach — the shape of a ship's move from an otherwise empty
// board — and legality, which filters reach by occupancy and by the
// destination site's state. This is the only implementation of §6 in the
// app; every caller that needs a legal move or the reason one is refused
// calls the functions here.

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
  | "out-of-range"
  | "path-blocked"
  | "destination-occupied"
  | "destination-dormant-site"
  | "destination-depleted-site";

function findShip(state: GameState, shipId: ShipId): Ship {
  const ship = state.ships.find((candidate) => candidate.id === shipId);
  if (ship === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  return ship;
}

/**
 * Why `destination` is not a legal move for `shipId` in the given state, as a
 * structured reason, or `undefined` when the move is legal. Reasons are
 * checked in order from the most fundamental (whose ship it is) to the most
 * specific (the destination square itself), so exactly one is ever returned.
 */
export function moveRefusalReason(
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
 * Every square `shipId` may legally move to in the given state: its §6 reach,
 * filtered down to the destinations `moveRefusalReason` raises no objection
 * to. Empty when the ship does not belong to the side to move or has already
 * moved this ply.
 */
export function legalDestinations(
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
        moveRefusalReason(state, shipId, destination) === undefined,
    );
}

/**
 * The ships of the side to move that have not yet moved this ply, and so are
 * still eligible to take a move action.
 */
function eligibleShips(state: GameState): readonly Ship[] {
  return state.ships.filter(
    (ship) =>
      ship.side === state.sideToMove && !state.movedThisPly.includes(ship.id),
  );
}

/** Whether the side to move has any legal move at all, with any eligible ship. */
export function sideToMoveHasLegalMove(state: GameState): boolean {
  return eligibleShips(state).some(
    (ship) => legalDestinations(state, ship.id).length > 0,
  );
}
