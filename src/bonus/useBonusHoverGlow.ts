// The planet, if any, currently glowing on the board and in the bonus panel
// above the clocks, because the player is hovering it in either place
// (rules.md §3.4, steal.md §10). Held above both `Board` and
// `PlanetBonusPanel`, since neither owns the other — `App` wires the two
// together through this hook, passing the same `onHoverSquare` callback to
// both, so hovering a bonus planet on the board or in the panel lights it
// in both. Not part of `GameState`, and it never reaches the rules modules.

import { useMemo, useState } from "react";
import { squareName, type Square } from "../rules/board";
import type { GameState } from "../rules/gameState";
import { bonusPanelSquareNames } from "./bonusPanelSquares";

export interface BonusHoverGlow {
  /**
   * The square to draw glowing, on the board (`Board`'s `glowSquare` prop)
   * and in the bonus panel (`PlanetBonusPanel`'s `glowSquare` prop), or
   * `undefined` for neither.
   */
  readonly glowSquare: Square | undefined;
  /**
   * Pass straight to both `Board`'s and `PlanetBonusPanel`'s
   * `onHoverSquare` prop — either one hovering a square lights it in both
   * places.
   */
  readonly onHoverSquare: (square: Square | undefined) => void;
}

/** The raw pointer position, tagged with the game it was hovered in. */
interface Hovered {
  readonly square: Square;
  readonly openingSeed: number;
}

/**
 * Tracks the hovered square, showing it as the glow only while it is still
 * one of the bonus panel's own squares in a game with the same opening seed
 * it was hovered in. The opening-seed check, not just the square-membership
 * one, is what clears a hover left over from a game that has since ended —
 * a new game can otherwise deal a bonus onto the same square the player was
 * last hovering, with no pointer anywhere near the panel.
 */
export function useBonusHoverGlow(state: GameState): BonusHoverGlow {
  const [hovered, setHovered] = useState<Hovered | undefined>(undefined);

  const glowSquare = useMemo(() => {
    if (
      hovered === undefined ||
      hovered.openingSeed !== state.openingSeed ||
      !bonusPanelSquareNames(state).has(squareName(hovered.square))
    ) {
      return undefined;
    }
    return hovered.square;
  }, [hovered, state]);

  const onHoverSquare = (square: Square | undefined) => {
    setHovered(
      square === undefined
        ? undefined
        : { square, openingSeed: state.openingSeed },
    );
  };

  return { glowSquare, onHoverSquare };
}
