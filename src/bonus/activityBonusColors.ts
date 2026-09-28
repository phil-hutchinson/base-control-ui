// The three colours a planet resources bonus's Additional nodes and Node
// scramble symbols draw in (steal.md §10): gold, silver and mid blue
// ordinarily, or gold plus the two player colours when player-matching
// nodes are on (DOUBLE or REQUIRED, steal.md §9) — silver and blue are then
// dropped in favour of the colours a matched node itself can be drawn in, so
// the symbol never borrows a colour that means something else on the board
// at the same time. Pure, so `PlanetBonusPanel` and the Quick Guide's
// PLANET RESOURCES diagram draw from the one source.

import type { PlayerMatchingSetting } from "../rules/playerMatching";
import { PLAYER_NODE_COLORS, SIGNAL_COLORS } from "../board/squareArt";

/** The three colours a symbol's rings or arcs are drawn in, in a fixed order. */
export type ActivityBonusSymbolColors = readonly [string, string, string];

/**
 * The three colours for the given game's player-matching setting (steal.md
 * §10): gold, red, green under DOUBLE or REQUIRED; gold, silver, blue
 * otherwise.
 */
export function activityBonusSymbolColors(
  playerMatching: PlayerMatchingSetting,
): ActivityBonusSymbolColors {
  if (playerMatching === "double" || playerMatching === "required") {
    return [
      SIGNAL_COLORS[0].core,
      PLAYER_NODE_COLORS.red.core,
      PLAYER_NODE_COLORS.green.core,
    ];
  }
  return [SIGNAL_COLORS[0].core, SIGNAL_COLORS[1].core, SIGNAL_COLORS[2].core];
}
