// Which planet (see planetArt.ts) sits in which bay, and the order the
// fourteen bays are judged in for spread. The arrangement is a fixed table,
// approved by the owner at plan time (see this story's
// implementation-plan.md, "The arrangement, and the ring the spread is
// judged on"), with the explicit expectation that individual planets may be
// swapped once the board is in front of them - swapping two bays' planets is
// a one-line change to `RING_SLOTS` per bay, and `planetPlacement.test.ts`
// re-checks the spread immediately.
//
// The ring order below is NOT `BAYS` order (src/rules/bays.ts). `BAYS`
// lists the fourteen bays in rules.md §3.1 order, which walks the board's
// bottom edge left to right: D1, H1, L1. The ring here is a closed walk
// clockwise around the board's perimeter, so it reaches the bottom edge
// travelling the other way, right to left: L1, H1, D1. Deriving adjacency
// from `BAYS` would treat D1 and A2 as neighbours, when the bay actually
// next to A2 around the perimeter is L1.
//
// The ring, stated explicitly, starting at D15 and going clockwise:
// D15, H15, L15 (top, left to right),
// O14, O10, O6, O2 (right, top to bottom),
// L1, H1, D1 (bottom, right to left),
// A2, A6, A10, A14 (left, bottom to top).

import { squareAt, squareName, type Square } from "../rules/board";
import { PLANETS, type PlanetArt } from "./planetArt";

function planetByNumber(number: number): PlanetArt {
  const planet = PLANETS.find((candidate) => candidate.number === number);
  if (!planet) {
    throw new Error(`no planet numbered ${number} in the catalogue`);
  }
  return planet;
}

interface RingSlot {
  readonly square: Square;
  readonly planetNumber: number;
}

// One row per bay, in ring order, transcribed from the table in
// implementation-plan.md. Each row also carries the traits that placed it
// there, so a reordering can be checked by eye against the same reasoning
// before the test confirms it.
const RING_SLOTS: readonly RingSlot[] = [
  { square: squareAt("D", 15), planetNumber: 9 }, // moon, brown
  { square: squareAt("H", 15), planetNumber: 8 }, // ring, turquoise
  { square: squareAt("L", 15), planetNumber: 11 }, // rose
  { square: squareAt("O", 14), planetNumber: 6 }, // companion, craters, brown
  { square: squareAt("O", 10), planetNumber: 13 }, // cyan-pink
  { square: squareAt("O", 6), planetNumber: 5 }, // ring, gold
  { square: squareAt("O", 2), planetNumber: 4 }, // blue-green
  { square: squareAt("L", 1), planetNumber: 2 }, // moons, purple
  { square: squareAt("H", 1), planetNumber: 7 }, // ring, brown
  { square: squareAt("D", 1), planetNumber: 10 }, // magenta
  { square: squareAt("A", 2), planetNumber: 1 }, // moon, craters, tan
  { square: squareAt("A", 6), planetNumber: 3 }, // brown
  { square: squareAt("A", 10), planetNumber: 14 }, // ring, blue-teal
  { square: squareAt("A", 14), planetNumber: 12 }, // craters, cream
];

/**
 * The fourteen bays as a closed walk around the board's perimeter, in the
 * order the spread of planets is judged - NOT `BAYS` order (see module
 * comment above).
 */
export const RING_ORDER: readonly Square[] = RING_SLOTS.map(
  (slot) => slot.square,
);

const PLANET_BY_SQUARE_NAME: ReadonlyMap<string, PlanetArt> = new Map(
  RING_SLOTS.map((slot) => [
    squareName(slot.square),
    planetByNumber(slot.planetNumber),
  ]),
);

/** The planet a bay holds, or `undefined` if the square is not a bay. */
export function planetForSquare(square: Square): PlanetArt | undefined {
  return PLANET_BY_SQUARE_NAME.get(squareName(square));
}
