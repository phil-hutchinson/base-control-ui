// Reading a game's state without touching its internals: who is to move
// and at what ply, and the game's result once it is over.

import type { EnergyTotals, GameState } from "../rules/gameState";
import { gameResult, isGameOver } from "../rules/gameLength";
import type { Side } from "../rules/fleet";

/**
 * The game's final outcome and both sides' energy totals. Built without the
 * rules' own optional `winner` field — `outcome` already says who won, and
 * the core's contract has no optional fields.
 */
export interface GameResult {
  readonly outcome: "green-won" | "red-won" | "draw";
  readonly energy: EnergyTotals;
}

/** The side to move and the ply it is on, or `null` once the game is over. */
export function toMove(
  state: GameState,
): { readonly side: Side; readonly plyNumber: number } | null {
  if (isGameOver(state)) {
    return null;
  }
  return { side: state.sideToMove, plyNumber: state.plyNumber };
}

/** The game's result, or `null` while it is still in progress. */
export function result(state: GameState): GameResult | null {
  if (!isGameOver(state)) {
    return null;
  }
  const { outcome, energy } = gameResult(state);
  return { outcome, energy };
}
