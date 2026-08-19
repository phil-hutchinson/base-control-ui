// §9's game length and the round arithmetic built on it. Consulted on every
// turn, not only at the last one — named for §9's subject rather than for
// the moment of ending.

/** §9's default game length in rounds. The one named place this number lives. */
export const DEFAULT_GAME_LENGTH_ROUNDS = 100;

/** Whether a value is a valid game length in rounds: a positive whole number. */
export function isGameLengthRounds(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

/** The number of plies a game of `lengthInRounds` rounds runs to. */
export function pliesForGameLength(lengthInRounds: number): number {
  return lengthInRounds * 2;
}

/**
 * The round a given ply belongs to: `ceil(plyNumber / 2)`, so plies 1 and 2
 * are round 1. This is deliberately unaware of the game's length — it does
 * not clamp to it — because that is a display concern, not an arithmetic
 * one; see `currentRound` for the clamped, state-aware form.
 */
export function roundForPly(plyNumber: number): number {
  if (!Number.isInteger(plyNumber) || plyNumber < 1) {
    throw new RangeError(
      `roundForPly: plyNumber must be a positive integer, got ${plyNumber}`,
    );
  }
  return Math.ceil(plyNumber / 2);
}
