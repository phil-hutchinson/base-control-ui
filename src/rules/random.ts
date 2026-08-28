// The seeded source of randomness that recorded games replay from — the
// published mulberry32 generator, restructured so the advanced seed is
// returned rather than kept in a closure, plus uniform and weighted index
// draws built on it. Pure functions only: a seed in, a value and the next
// seed out. Knows nothing about the game.

/**
 * One step of mulberry32. Given a 32-bit unsigned seed, returns a float in
 * [0, 1) and the next seed, also normalised to a 32-bit unsigned integer.
 */
export function mulberry32(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, nextSeed >>> 0];
}

/**
 * Draws a uniform index in [0, count) from a seed, returning the index and
 * the next seed. Throws a RangeError for a count that is not a positive
 * integer, so a caller can never silently draw from an empty pool.
 */
export function drawIndex(
  seed: number,
  count: number,
): [index: number, nextSeed: number] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError(
      `drawIndex: count must be a positive integer, got ${count}`,
    );
  }
  const [value, nextSeed] = mulberry32(seed);
  const index = Math.floor(value * count);
  return [index, nextSeed];
}

/**
 * Draws an index from a list of weights, with each index's chance of being
 * drawn proportional to its own weight's share of the total. Backs every
 * weighted draw the game makes: the three node-drain and recovery
 * distributions, and the pressure-weighted charge draw.
 *
 * Advances the seed exactly once, like drawIndex, so a caller's seed
 * consumption is predictable and a recorded game replays. Throws a
 * RangeError for an empty list, for a weight that is negative or not
 * finite, or for a total that is not positive, so a caller can never
 * silently draw from nothing. A weight of 0 is legal and is simply never
 * drawn.
 */
export function drawWeightedIndex(
  seed: number,
  weights: readonly number[],
): [index: number, nextSeed: number] {
  if (weights.length === 0) {
    throw new RangeError("drawWeightedIndex: weights must not be empty");
  }
  let total = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError(
        `drawWeightedIndex: weights must be finite and non-negative, got ${weight}`,
      );
    }
    total += weight;
  }
  if (total <= 0) {
    throw new RangeError(
      `drawWeightedIndex: total weight must be positive, got ${total}`,
    );
  }

  const [value, nextSeed] = mulberry32(seed);
  const target = value * total;
  let cumulative = 0;
  for (let index = 0; index < weights.length; index++) {
    cumulative += weights[index];
    if (target < cumulative) {
      return [index, nextSeed];
    }
  }
  // Floating-point accumulation can land target at or past the running
  // total even though value < 1; the last in-range index is the answer.
  return [weights.length - 1, nextSeed];
}
