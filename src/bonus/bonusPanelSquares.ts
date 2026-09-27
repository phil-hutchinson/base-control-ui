// Which planet squares the bonus panel currently draws, under any planet
// bonus setting (rules.md §3.4, steal.md §10). `App` uses this to tell
// whether a square a player is hovering in the panel is still shown there —
// it stops being shown, for instance, when a claim replaces one of the two
// ADVANCED bonuses (steal.md §10) — so the board's hover glow can be
// cleared rather than left pointing at a planet the panel no longer draws.

import { squareName } from "../rules/board";
import type { GameState } from "../rules/gameState";

export function bonusPanelSquareNames(state: GameState): ReadonlySet<string> {
  if (state.planetBonus === "off") {
    return new Set();
  }
  if (state.planetBonus === "advanced") {
    return new Set(
      state.advancedBonuses.map((entry) => squareName(entry.square)),
    );
  }
  return new Set(
    [...state.bonusPlanets.green, ...state.bonusPlanets.red].map((entry) =>
      squareName(entry.square),
    ),
  );
}
