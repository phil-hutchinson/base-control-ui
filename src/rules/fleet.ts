// The two sides and the starting fleet (rules.md §4): five or six ships a
// side, chosen before play begins, one per occupied starting square.

import { type Square, squareAt } from "./board";
import { MAX_POWER, type PowerLevel } from "./power";

/** The two sides (rules.md §4). */
export type Side = "green" | "red";

/** A ship's stable identity, distinct from the square it currently occupies. */
export type ShipId = string;

/** One ship's starting square, side and power level. */
export interface FleetEntry {
  readonly id: ShipId;
  readonly square: Square;
  readonly side: Side;
  readonly power: PowerLevel;
}

/** How many ships one side has (rules.md §4): five or six. */
export type FleetSize = 5 | 6;

/**
 * The valid fleet sizes, in the order the start screen renders them: largest
 * first, so the leftmost choice is the simplest, default game.
 */
export const FLEET_SIZES: readonly FleetSize[] = [6, 5];

/** §4's standard game: six ships a side. */
export const DEFAULT_FLEET_SIZE: FleetSize = 6;

/** Whether a value is one of the valid fleet sizes. */
export function isFleetSize(value: number): value is FleetSize {
  return (FLEET_SIZES as readonly number[]).includes(value);
}

/**
 * The most ships a side can ever have, regardless of the current game's
 * fleet size. Used where a bound must hold across every fleet size rather
 * than the one a particular game was dealt with — see `energy.ts`.
 */
export const MAX_SHIPS_PER_SIDE = Math.max(...FLEET_SIZES);

/**
 * One occupied starting square in a starting layout, in the layout's
 * clockwise order.
 */
interface LayoutEntry {
  readonly square: Square;
  readonly side: Side;
}

/**
 * The six-a-side layout (rules.md §4): twelve of the fourteen starting
 * squares are occupied, H15 and H1 left empty. Listed clockwise starting
 * from L15.
 */
const SIX_A_SIDE_LAYOUT: readonly LayoutEntry[] = [
  { square: squareAt("L", 15), side: "red" },
  { square: squareAt("O", 14), side: "green" },
  { square: squareAt("O", 10), side: "red" },
  { square: squareAt("O", 6), side: "green" },
  { square: squareAt("O", 2), side: "red" },
  { square: squareAt("L", 1), side: "green" },
  { square: squareAt("D", 1), side: "green" },
  { square: squareAt("A", 2), side: "red" },
  { square: squareAt("A", 6), side: "green" },
  { square: squareAt("A", 10), side: "red" },
  { square: squareAt("A", 14), side: "green" },
  { square: squareAt("D", 15), side: "red" },
];

/**
 * The five-a-side layout (rules.md §4): ten of the fourteen starting
 * squares are occupied, O14, O2, A14 and A2 left empty. Listed clockwise
 * from H15.
 */
const FIVE_A_SIDE_LAYOUT: readonly LayoutEntry[] = [
  { square: squareAt("H", 15), side: "green" },
  { square: squareAt("L", 15), side: "red" },
  { square: squareAt("O", 10), side: "green" },
  { square: squareAt("O", 6), side: "red" },
  { square: squareAt("L", 1), side: "green" },
  { square: squareAt("H", 1), side: "red" },
  { square: squareAt("D", 1), side: "green" },
  { square: squareAt("A", 6), side: "red" },
  { square: squareAt("A", 10), side: "green" },
  { square: squareAt("D", 15), side: "red" },
];

const LAYOUTS_BY_FLEET_SIZE: Readonly<
  Record<FleetSize, readonly LayoutEntry[]>
> = {
  5: FIVE_A_SIDE_LAYOUT,
  6: SIX_A_SIDE_LAYOUT,
};

/**
 * The starting fleet for a game with `fleetSize` ships a side, in the
 * layout's clockwise order (rules.md §4). Every ship starts at full power.
 * Ids are `green-N` / `red-N`, numbered 1..`fleetSize` per side in that same
 * clockwise order.
 */
export function startingFleet(fleetSize: FleetSize): readonly FleetEntry[] {
  const layout = LAYOUTS_BY_FLEET_SIZE[fleetSize];
  const nextNumberBySide: Record<Side, number> = { green: 1, red: 1 };

  return layout.map((entry) => {
    const number = nextNumberBySide[entry.side]++;
    return {
      id: `${entry.side}-${number}`,
      square: entry.square,
      side: entry.side,
      power: MAX_POWER,
    };
  });
}
