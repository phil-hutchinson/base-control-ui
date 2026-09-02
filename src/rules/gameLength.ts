// §9's game length and the round arithmetic built on it. Consulted on every
// turn, not only at the last one — named for §9's subject rather than for
// the moment of ending.

import type { EnergyTotals, GameState } from "./gameState";
import type { Side } from "./fleet";

/** §9's default game length in rounds. The one named place this number lives. */
export const DEFAULT_GAME_LENGTH_ROUNDS = 30;

/**
 * §9's offered game lengths, shortest first — what the start screen lets a
 * player choose between, not a restriction on what a state may hold.
 * `isGameLengthRounds` goes on accepting any positive whole number, because
 * the rules layer must go on accepting the short games the test suite
 * builds; this list constrains the UI only.
 */
export const GAME_LENGTH_OPTIONS_ROUNDS: readonly number[] = [30, 45, 60, 90];

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

/**
 * Whether the given state's game has ended (rules.md §9): `plyNumber` has
 * run past the plies its own `lengthInRounds` allows, **or** both sides
 * have run out of time (rules.md §10). Judged against the state's own
 * length, never against `DEFAULT_GAME_LENGTH_ROUNDS` — a state started at a
 * different length ends at a different ply.
 *
 * This is the one place the clock's ending needs stating: everything else
 * built on `isGameOver` — the session reducer's refusal of an activation,
 * `App`'s swap to the game-over panel, `applyPassGuard`'s first check, and
 * `gameResult` — then follows for free.
 */
export function isGameOver(state: GameState): boolean {
  return (
    state.plyNumber > pliesForGameLength(state.lengthInRounds) ||
    (state.outOfTime.green && state.outOfTime.red)
  );
}

/**
 * The round to display for the given state: the round its `plyNumber` is
 * in, held at the game's own length once play has run past the end so the
 * counter reads (for example) 100/100 rather than 101/100.
 */
export function currentRound(state: GameState): number {
  return Math.min(roundForPly(state.plyNumber), state.lengthInRounds);
}

/** The result of a finished game: which side won, or a draw, with both final totals. */
export interface GameResult {
  readonly outcome: "green-won" | "red-won" | "draw";
  readonly winner?: Side;
  readonly energy: EnergyTotals;
}

/**
 * The result of the given state's game. The state's game must already be
 * over — asking for the result of a game still in progress is a caller bug
 * and throws a `RangeError`.
 */
export function gameResult(state: GameState): GameResult {
  if (!isGameOver(state)) {
    throw new RangeError(
      `gameResult: game is not over at ply ${state.plyNumber} of ${state.lengthInRounds} rounds`,
    );
  }

  const { green, red } = state.energy;
  if (green > red) {
    return { outcome: "green-won", winner: "green", energy: state.energy };
  }
  if (red > green) {
    return { outcome: "red-won", winner: "red", energy: state.energy };
  }
  return { outcome: "draw", energy: state.energy };
}
