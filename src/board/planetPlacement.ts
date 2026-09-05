// Which planet (see planetArt.ts) sits on which planet square, and the order
// the fourteen planet squares are judged in for spread. The arrangement is a
// fixed table, with the explicit expectation that individual planets may be
// swapped once the board is in front of them - swapping two squares' planets
// is a one-line change to `RING_SLOTS` per square, and
// `planetPlacement.test.ts` re-checks the spread immediately.
//
// The ring order below is NOT `PLANETS` order (src/rules/planets.ts).
// `PLANETS` lists the fourteen planet squares in rules.md §3.1 order, which
// walks the board's bottom edge left to right: D1, H1, L1. The ring here is
// a closed walk clockwise around the board's perimeter, so it reaches the
// bottom edge travelling the other way, right to left: L1, H1, D1. Deriving
// adjacency from `PLANETS` would treat D1 and A2 as neighbours, when the
// planet square actually next to A2 around the perimeter is L1.
//
// The ring, stated explicitly, starting at D15 and going clockwise:
// D15, H15, L15 (top, left to right),
// O14, O10, O6, O2 (right, top to bottom),
// L1, H1, D1 (bottom, right to left),
// A2, A6, A10, A14 (left, bottom to top).

import { squareAt, squareName, type Square } from "../rules/board";
import { PLANET_ART, type PlanetArt } from "./planetArt";

function planetByNumber(number: number): PlanetArt {
  const planet = PLANET_ART.find((candidate) => candidate.number === number);
  if (!planet) {
    throw new Error(`no planet numbered ${number} in the catalogue`);
  }
  return planet;
}

interface RingSlot {
  readonly square: Square;
  readonly planetNumber: number;
}

// One row per planet square, in ring order. Each row also carries the
// planet's name, so a reordering can be checked by eye before the test
// confirms it.
const RING_SLOTS: readonly RingSlot[] = [
  { square: squareAt("D", 15), planetNumber: 9 }, // Banded brown planet with an earth-like moon
  { square: squareAt("H", 15), planetNumber: 8 }, // Turquoise planet with a vertical white ring
  { square: squareAt("L", 15), planetNumber: 11 }, // Rose-and-cream banded planet with a storm
  { square: squareAt("O", 14), planetNumber: 6 }, // Double planet: banded brown with a cratered companion
  { square: squareAt("O", 10), planetNumber: 13 }, // Cyan-purple-pink wavy planet
  { square: squareAt("O", 6), planetNumber: 5 }, // Gold planet with a wide ring
  { square: squareAt("O", 2), planetNumber: 4 }, // Blue-green water world
  { square: squareAt("L", 1), planetNumber: 2 }, // Peru-and-purple planet with four small moons
  { square: squareAt("H", 1), planetNumber: 7 }, // Brown-and-pink planet with a tilted grey ring
  { square: squareAt("D", 1), planetNumber: 10 }, // Magenta planet with pale surface lines
  { square: squareAt("A", 2), planetNumber: 1 }, // Tan planet with a cratered moon
  { square: squareAt("A", 6), planetNumber: 3 }, // Banded chocolate-brown planet
  { square: squareAt("A", 10), planetNumber: 14 }, // Blue-teal ringed planet with a gold core
  { square: squareAt("A", 14), planetNumber: 12 }, // Cream-and-olive crater planet
];

/**
 * The fourteen planet squares as a closed walk around the board's
 * perimeter, in the order the spread of planets is judged - NOT `PLANETS`
 * order (see module comment above).
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

/** The planet a planet square holds, or `undefined` if the square is not a planet. */
export function planetForSquare(square: Square): PlanetArt | undefined {
  return PLANET_BY_SQUARE_NAME.get(squareName(square));
}
