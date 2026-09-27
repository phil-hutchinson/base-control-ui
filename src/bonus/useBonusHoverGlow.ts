// The planet, if any, currently glowing on the board because the player is
// hovering it in the bonus panel above the clocks (rules.md §3.4, steal.md
// §10). Held above both `Board` and `PlanetBonusPanel`, since neither owns
// the other — `App` wires the two together through this hook. Not part of
// `GameState`, and it never reaches the rules modules.

import { useEffect, useState } from "react";
import { squareName, type Square } from "../rules/board";
import type { GameState } from "../rules/gameState";
import { bonusPanelSquareNames } from "./bonusPanelSquares";

export interface BonusHoverGlow {
  /** The square to draw glowing on the board, or `undefined` for none. */
  readonly glowSquare: Square | undefined;
  /** Pass straight to `PlanetBonusPanel`'s `onHoverSquare` prop. */
  readonly onHoverSquare: (square: Square | undefined) => void;
}

/**
 * Tracks the hovered square, clearing it whenever it stops being one of the
 * bonus panel's own squares under the game's current state — for example
 * when a claim replaces one of the two ADVANCED bonuses, or moves the game
 * on to a state where the hovered planet no longer carries a bonus at all.
 */
export function useBonusHoverGlow(state: GameState): BonusHoverGlow {
  const [glowSquare, setGlowSquare] = useState<Square | undefined>(undefined);

  useEffect(() => {
    setGlowSquare((current) =>
      current !== undefined &&
      bonusPanelSquareNames(state).has(squareName(current))
        ? current
        : undefined,
    );
  }, [state]);

  return { glowSquare, onHoverSquare: setGlowSquare };
}
