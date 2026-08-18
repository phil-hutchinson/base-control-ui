// The seeded source of randomness that recorded games replay from — the
// published mulberry32 generator, restructured so the advanced seed is
// returned rather than kept in a closure. Pure functions only: a seed in,
// a value and the next seed out. Knows nothing about the game.

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
