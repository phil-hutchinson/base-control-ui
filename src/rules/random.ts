// The published mulberry32 generator, restructured so the advanced seed is
// returned rather than kept in a closure, plus the two RandomSource
// implementations every draw in the rules goes through: seededRandom, which
// draws fresh from a seed — one mulberry32 step per draw, uniform or
// weighted — and records what it drew, and recordedRandom, which replays a
// list of draws recorded by a previous seededRandom call and throws
// DesyncError if they do not fit the draws asked of it. Knows nothing about
// the game.

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
 * What every random draw in the rules goes through: a uniform draw of an
 * index below a count, a weighted draw of an index into a list of weights,
 * a read-out of every draw made through it so far (in draw order), and a
 * completion check a caller runs once it is done drawing. The one stateful
 * object the rules touch — made per game (seededRandom) or per call
 * (recordedRandom) and never shared between games.
 */
export interface RandomSource {
  uniform(count: number): number;
  weighted(weights: readonly number[]): number;
  draws(): readonly number[];
  checkComplete(): void;
}

/**
 * A RandomSource that also reads out the seed its next draw would use, so a
 * caller can resume the same stream later with `seededRandom(thatSeed)`.
 * Not part of the RandomSource contract itself: the core re-exports
 * seededRandom as returning a plain RandomSource.
 */
export interface SeededRandomSource extends RandomSource {
  currentSeed(): number;
}

/**
 * Draws fresh from a seed, one mulberry32 step per draw, uniform or
 * weighted. Records every index it draws, in order. Its completion check
 * never throws: a seeded source has drawn exactly as many times as it was
 * asked to.
 */
export function seededRandom(seed: number): SeededRandomSource {
  let currentSeed = seed;
  const recorded: number[] = [];

  return {
    uniform(count) {
      if (!Number.isInteger(count) || count <= 0) {
        throw new RangeError(
          `seededRandom: count must be a positive integer, got ${count}`,
        );
      }
      const [value, nextSeed] = mulberry32(currentSeed);
      const index = Math.floor(value * count);
      currentSeed = nextSeed;
      recorded.push(index);
      return index;
    },
    weighted(weights) {
      if (weights.length === 0) {
        throw new RangeError("seededRandom: weights must not be empty");
      }
      let total = 0;
      for (const weight of weights) {
        if (!Number.isFinite(weight) || weight < 0) {
          throw new RangeError(
            `seededRandom: weights must be finite and non-negative, got ${weight}`,
          );
        }
        total += weight;
      }
      if (total <= 0) {
        throw new RangeError(
          `seededRandom: total weight must be positive, got ${total}`,
        );
      }

      const [value, nextSeed] = mulberry32(currentSeed);
      const target = value * total;
      let cumulative = 0;
      let index = weights.length - 1;
      while (index > 0 && weights[index] <= 0) {
        index--;
      }
      // Floating-point accumulation can land target at or past the running
      // total even though value < 1; the last index with a positive weight
      // is the fallback answer in that case, never a weight-0 index, which
      // a seeded source can never draw.
      for (let candidate = 0; candidate < weights.length; candidate++) {
        cumulative += weights[candidate];
        if (target < cumulative) {
          index = candidate;
          break;
        }
      }
      currentSeed = nextSeed;
      recorded.push(index);
      return index;
    },
    draws() {
      return [...recorded];
    },
    checkComplete() {
      // A seeded source always has one draw per call made; nothing to check.
    },
    currentSeed() {
      return currentSeed;
    },
  };
}

/**
 * Thrown by recordedRandom when the draws it was given do not fit the
 * draws it is asked to replay: a bug in the caller or a desync between
 * client and server, never a player error.
 */
export class DesyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesyncError";
  }
}

/**
 * Replays a list of draws recorded by a previous seededRandom call, made
 * fresh per call (one startGame or one applyPly) rather than per game.
 * Throws DesyncError if a draw is requested after the list runs out, if a
 * recorded entry is not a valid index for the count or weights it is asked
 * to draw from, if a recorded weighted index points at a weight of 0 (which
 * a seeded source can never draw), or — from its completion check — if any
 * draws are left over once the caller is done.
 */
export function recordedRandom(draws: readonly number[]): RandomSource {
  let position = 0;
  const consumed: number[] = [];

  function next(): number {
    if (position >= draws.length) {
      throw new DesyncError("recordedRandom: no draws left to replay");
    }
    const value = draws[position];
    position += 1;
    if (!Number.isInteger(value) || value < 0) {
      throw new DesyncError(
        `recordedRandom: recorded draw must be a non-negative integer, got ${value}`,
      );
    }
    return value;
  }

  return {
    uniform(count) {
      const index = next();
      if (index >= count) {
        throw new DesyncError(
          `recordedRandom: recorded index ${index} is out of range for count ${count}`,
        );
      }
      consumed.push(index);
      return index;
    },
    weighted(weights) {
      const index = next();
      if (index >= weights.length) {
        throw new DesyncError(
          `recordedRandom: recorded index ${index} is out of range for ${weights.length} weights`,
        );
      }
      if (weights[index] === 0) {
        throw new DesyncError(
          `recordedRandom: recorded index ${index} has weight 0, which a seeded source can never draw`,
        );
      }
      consumed.push(index);
      return index;
    },
    draws() {
      return [...consumed];
    },
    checkComplete() {
      if (position < draws.length) {
        throw new DesyncError(
          `recordedRandom: ${draws.length - position} draw(s) left over after the call completed`,
        );
      }
    },
  };
}
