// Movement (rules.md §6): a ship moves one or two squares, orthogonally,
// diagonally or in an L, priced by §6's table, and a ship may take any shape
// it can afford — reach, a clear path, an empty destination, and a
// destination that holds no node unless that node is charged, are the whole
// of the restriction.
// A trapped ship (rules.md §8.5) has no move at all. This is the only
// implementation of §6 in the app; every caller that needs a legal move or
// the reason one is refused calls the functions here. §9's game-over check is
// layered in front of §6's own checks in each public function below.

import {
  COLUMN_LETTERS,
  type Square,
  isOnBoard,
  squareAt,
  squareName,
} from "./board";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import {
  type GameState,
  type Ship,
  nodeStateAt,
  shipsBySquare,
} from "./gameState";
import type { PowerLevel } from "./power";
import { isShipTrapped } from "./trap";

type StraightKind = "orthogonal" | "diagonal";

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
  kind: StraightKind,
): ReadonlyArray<readonly [number, number]> {
  return kind === "orthogonal" ? ORTHOGONAL_DIRECTIONS : DIAGONAL_DIRECTIONS;
}

interface StraightReachOption {
  readonly kind: StraightKind;
  readonly distance: 1 | 2;
  /** The power this shape costs (rules.md §6's table). */
  readonly cost: PowerLevel;
}

/**
 * One of the L's eight destinations, as an offset from the origin in
 * (column, row) terms, together with the two squares it turns through: the
 * one it turns through orthogonally, and the one it turns through
 * diagonally. Both corners are given as offsets from the origin too.
 */
interface LOffset {
  readonly delta: readonly [number, number];
  readonly orthogonalCorner: readonly [number, number];
  readonly diagonalCorner: readonly [number, number];
}

interface LReachOption {
  readonly kind: "L";
  /** The power this shape costs (rules.md §6's table). */
  readonly cost: PowerLevel;
  readonly offsets: readonly LOffset[];
}

type ReachOption = StraightReachOption | LReachOption;

/**
 * The L's eight destinations (rules.md §6): one orthogonal step and one
 * diagonal step, in either order. Written down as data rather than derived,
 * so it can be read against the rules at a glance; `movement.test.ts` pins
 * the sign rule that generates it. For an offset (dc, dr), the orthogonal
 * corner is one step along the longer axis and the diagonal corner is one
 * diagonal step towards the destination — e.g. the L from H8 to J9 is
 * (dc: 2, dr: 1), whose orthogonal corner is I8 and whose diagonal corner is
 * I9, exactly as rules.md §6 describes it.
 */
const L_OFFSETS: readonly LOffset[] = [
  { delta: [2, 1], orthogonalCorner: [1, 0], diagonalCorner: [1, 1] },
  { delta: [2, -1], orthogonalCorner: [1, 0], diagonalCorner: [1, -1] },
  { delta: [-2, 1], orthogonalCorner: [-1, 0], diagonalCorner: [-1, 1] },
  { delta: [-2, -1], orthogonalCorner: [-1, 0], diagonalCorner: [-1, -1] },
  { delta: [1, 2], orthogonalCorner: [0, 1], diagonalCorner: [1, 1] },
  { delta: [1, -2], orthogonalCorner: [0, -1], diagonalCorner: [1, -1] },
  { delta: [-1, 2], orthogonalCorner: [0, 1], diagonalCorner: [-1, 1] },
  { delta: [-1, -2], orthogonalCorner: [0, -1], diagonalCorner: [-1, -1] },
];

/** §6's cost table, transcribed row for row. */
const REACH_OPTIONS: readonly ReachOption[] = [
  { kind: "orthogonal", distance: 1, cost: 0 },
  { kind: "diagonal", distance: 1, cost: 1 },
  { kind: "orthogonal", distance: 2, cost: 2 },
  { kind: "L", cost: 2, offsets: L_OFFSETS },
];

/**
 * One square a ship could move to: the destination, the squares passed over
 * on the way there (in order, excluding both the origin and the
 * destination), and the power the move costs (rules.md §6). The L's
 * `passedOver` carries both of its corners, orthogonal corner first.
 */
export interface ReachEntry {
  readonly destination: Square;
  readonly passedOver: readonly Square[];
  readonly cost: PowerLevel;
}

/** The square offset from `origin` by (`deltaColumn`, `deltaRow`), or `undefined` when that square would leave the board. */
function squareAtOffset(
  origin: Square,
  deltaColumn: number,
  deltaRow: number,
): Square | undefined {
  const originColumnIndex = COLUMN_LETTERS.indexOf(origin.column);
  const column = COLUMN_LETTERS[originColumnIndex + deltaColumn];
  const row = origin.row + deltaRow;

  if (column === undefined || !isOnBoard(column, row)) {
    return undefined;
  }
  return squareAt(column, row);
}

/**
 * Every one of §6's twenty shapes from `origin` on an otherwise empty board,
 * regardless of power, each carrying its own cost. Moves that would leave the
 * board are omitted entirely. Says nothing about occupancy, nodes, whose ply
 * it is, or what any particular ship can afford — `reachFrom` below narrows
 * this to the affordable subset, and every other caller in this module reads
 * one or the other rather than generating the geometry again.
 */
export function allShapesFrom(origin: Square): readonly ReachEntry[] {
  const entries: ReachEntry[] = [];

  for (const option of REACH_OPTIONS) {
    if (option.kind === "L") {
      for (const offset of option.offsets) {
        const destination = squareAtOffset(origin, ...offset.delta);
        if (destination === undefined) {
          continue;
        }

        const orthogonalCorner = squareAtOffset(
          origin,
          ...offset.orthogonalCorner,
        );
        const diagonalCorner = squareAtOffset(origin, ...offset.diagonalCorner);
        if (orthogonalCorner === undefined || diagonalCorner === undefined) {
          throw new RangeError(
            `an L's corner left the board from ${squareName(origin)} while its destination did not`,
          );
        }

        entries.push({
          destination,
          passedOver: [orthogonalCorner, diagonalCorner],
          cost: option.cost,
        });
      }
      continue;
    }

    for (const [deltaColumn, deltaRow] of directionsFor(option.kind)) {
      const path: Square[] = [];
      let offBoard = false;

      for (let step = 1; step <= option.distance; step++) {
        const square = squareAtOffset(
          origin,
          deltaColumn * step,
          deltaRow * step,
        );
        if (square === undefined) {
          offBoard = true;
          break;
        }
        path.push(square);
      }

      if (!offBoard) {
        entries.push({
          destination: path[path.length - 1],
          passedOver: path.slice(0, -1),
          cost: option.cost,
        });
      }
    }
  }

  return entries;
}

/**
 * Every square a ship at `origin` carrying `power` could move to on an
 * otherwise empty board (rules.md §6): the affordable subset of
 * `allShapesFrom`.
 */
export function reachFrom(
  origin: Square,
  power: PowerLevel,
): readonly ReachEntry[] {
  return allShapesFrom(origin).filter((entry) => entry.cost <= power);
}

/**
 * The shape (if any) that reaches `destination` from `origin`, regardless of
 * power — used to tell "not one of the twenty shapes at all" apart from "a
 * shape the ship cannot currently afford".
 */
export function shapeReaching(
  origin: Square,
  destination: Square,
): ReachEntry | undefined {
  const destinationName = squareName(destination);
  return allShapesFrom(origin).find(
    (entry) => squareName(entry.destination) === destinationName,
  );
}

/**
 * The structured reasons a square is not a legal destination for a ship.
 * Never a sentence — the wording for these lives in `src/board/`.
 */
export type MoveRefusalReason =
  | "not-your-ship"
  | "ship-trapped"
  | "out-of-range"
  | "cannot-afford"
  | "path-blocked"
  | "destination-occupied"
  | "destination-uncharged-node"
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
 * Why `destination` is not a legal move for `shipId` in the given state, as a
 * structured reason, or `undefined` when the move is legal. Reasons are
 * checked in order from the most fundamental (whether the game is even still
 * being played) to the most specific (the destination square itself):
 * whether the game is over, whose ship it is, whether it is trapped
 * (rules.md §8.5 — a fact about the ship itself, so it is checked alongside
 * the others before anything about the destination), and finally §6's reach,
 * affordability, path, destination-occupancy and
 * uncharged-destination checks. "Out of range" now means only that no shape
 * reaches the square at all — a real shape the ship cannot currently pay for
 * is "cannot afford" instead, since the two are refused for different reasons
 * and read differently to a player. `destination-occupied` is checked before
 * `destination-uncharged-node`, because the two can co-occur — a trapped
 * enemy ship stands on a depleted node — and occupancy is the more immediate
 * fact. Inactive and depleted destinations are refused the same way, since
 * §6 states both in one sentence and a ship may occupy only a charged node.
 */
export function moveRefusalReason(
  state: GameState,
  shipId: ShipId,
  destination: Square,
): MoveRefusalReason | undefined {
  if (isGameOver(state)) {
    return "game-over";
  }

  const ship = findShip(state, shipId);

  if (ship.side !== state.sideToMove) {
    return "not-your-ship";
  }
  if (isShipTrapped(state, shipId)) {
    return "ship-trapped";
  }

  const entry = shapeReaching(ship.square, destination);
  if (entry === undefined) {
    return "out-of-range";
  }
  if (entry.cost > ship.power) {
    return "cannot-afford";
  }

  const occupied = shipsBySquare(state);
  const blocked = entry.passedOver.some((square) => {
    const occupant = occupied.get(squareName(square));
    return occupant !== undefined && occupant.side !== ship.side;
  });
  if (blocked) {
    return "path-blocked";
  }
  if (occupied.has(squareName(destination))) {
    return "destination-occupied";
  }
  const destinationNodeState = nodeStateAt(state, destination);
  if (
    destinationNodeState === "depleted" ||
    destinationNodeState === "inactive"
  ) {
    return "destination-uncharged-node";
  }

  return undefined;
}

/**
 * Every square `shipId` may legally move to in the given state: the
 * affordable subset of its §6 reach, filtered by path and destination
 * occupancy - only an enemy ship on a passed-over square blocks. Empty once
 * the game is over, when the ship does not belong to the side to move, or
 * when the ship is trapped (rules.md §8.5). An uncharged destination needs no
 * filter of its own here — `moveRefusalReason` already excludes it below —
 * flying over one is still free, only landing is barred.
 */
export function legalDestinations(
  state: GameState,
  shipId: ShipId,
): readonly Square[] {
  if (isGameOver(state)) {
    return [];
  }

  const ship = findShip(state, shipId);
  if (ship.side !== state.sideToMove || isShipTrapped(state, shipId)) {
    return [];
  }

  return reachFrom(ship.square, ship.power)
    .map((entry) => entry.destination)
    .filter(
      (destination) =>
        moveRefusalReason(state, shipId, destination) === undefined,
    );
}

/**
 * Whether the side to move has any legal move at all, with any of its ships.
 * Used by the §5 pass guard.
 */
export function sideToMoveHasLegalMove(state: GameState): boolean {
  return state.ships
    .filter((ship) => ship.side === state.sideToMove)
    .some((ship) => legalDestinations(state, ship.id).length > 0);
}
