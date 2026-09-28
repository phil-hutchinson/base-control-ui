// Which planet squares the bonus panel currently draws, under any planet
// bonus or planet resources setting (rules.md §3.4, steal.md §10). `App` uses
// this to tell whether a square a player is hovering in the panel is still
// shown there — it stops being shown, for instance, when a claim replaces one
// of the two activity bonuses (steal.md §10) — so the board's hover glow can
// be cleared rather than left pointing at a planet the panel no longer draws.

import { squareName } from "../rules/board";
import type { GameState } from "../rules/gameState";

export function bonusPanelSquareNames(state: GameState): ReadonlySet<string> {
  if (state.planetActivity !== "off") {
    return new Set(
      state.activityBonuses.map((entry) => squareName(entry.square)),
    );
  }
  if (state.planetBonus === "off") {
    return new Set();
  }
  return new Set(
    [...state.bonusPlanets.green, ...state.bonusPlanets.red].map((entry) =>
      squareName(entry.square),
    ),
  );
}
