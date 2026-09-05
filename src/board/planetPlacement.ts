// A random one-to-one arrangement of the twelve planet drawings (see
// planetArt.ts) over the twelve planet squares (src/rules/planets.ts),
// dealt from the game's own opening seed so every game looks different and
// a recorded game redraws identically.
//
// The shuffle runs its own copy of the seed, starting from the same value
// the opening deal started from (`GameState.openingSeed`) but never touching
// the deal's own seed stream: which drawing sits where is purely visual and
// carries no rule, so it lives here in the board layer rather than in
// `src/rules/`.

import { mulberry32 } from "../rules/random";
import { PLANETS } from "../rules/planets";
import { squareName, type Square } from "../rules/board";
import { PLANET_ART, type PlanetArt } from "./planetArt";

/**
 * A Fisher-Yates shuffle of `items`, driven by repeated draws from
 * `mulberry32` starting at `seed`. Pure: the same seed always produces the
 * same order.
 */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const [value, nextSeed] = mulberry32(currentSeed);
    currentSeed = nextSeed;
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The drawing dealt to every planet square, for one game, keyed by square
 * name. Throws if the catalogue and the planet squares ever disagree in
 * count, so a future catalogue edit cannot silently leave a square bare.
 */
export function planetArrangement(
  openingSeed: number,
): ReadonlyMap<string, PlanetArt> {
  if (PLANET_ART.length !== PLANETS.length) {
    throw new Error(
      `planetArrangement: ${PLANET_ART.length} drawings for ${PLANETS.length} planet squares`,
    );
  }
  const drawings = shuffled(PLANET_ART, openingSeed);
  return new Map(
    PLANETS.map((square, index) => [squareName(square), drawings[index]]),
  );
}

/** The drawing a square carries in an arrangement, or `undefined` if it is not a planet square. */
export function planetForSquare(
  arrangement: ReadonlyMap<string, PlanetArt>,
  square: Square,
): PlanetArt | undefined {
  return arrangement.get(squareName(square));
}
